"""Native, bundled desktop UI; network work never runs on Tk's event thread."""
from __future__ import annotations
import queue
import threading
import time
import tkinter as tk
from tkinter import messagebox, ttk
import webbrowser
from . import VERSION
from .installer import Installer, Result, SetupError, TV, resource

BG, PANEL, FG, MUTED, RED = "#0b0c10", "#151820", "#f4f4f6", "#a1a6b3", "#f3444e"

class DemoInstaller:
    """Explicit UI preview, isolated from all network and credential operations."""
    def discover(self): return [TV("192.0.2.10", "Hisense · demonstracija")]
    def identify(self, host): return TV("192.0.2.10", "Hisense · demonstracija")
    def request_pin(self, host): return time.monotonic()+60
    def confirm_and_install(self, pin):
        if pin != "1234": raise SetupError("U demonstraciji koristi PIN 1234.")
        return Result(False, 1)
    def verify(self): return Result(True, 1)
    def launch(self): pass
    def close(self): pass

class Window:
    def __init__(self, root, backend, demo=False):
        self.root, self.backend, self.demo = root, backend, demo
        self.events = queue.Queue()
        self.busy = self.closed = self.installing = False
        self.step = 0
        self.tv = None
        self.tvs = []
        root.title("LUMA Setup");root.geometry("850x620");root.minsize(780,590);root.configure(bg=BG)
        root.protocol("WM_DELETE_WINDOW", self.close)
        style = ttk.Style(root);style.theme_use("clam")
        style.configure("TProgressbar", troughcolor=PANEL, background=RED, bordercolor=PANEL, lightcolor=RED, darkcolor=RED)
        style.configure("Luma.TCombobox", fieldbackground=PANEL, background=PANEL, foreground=FG, arrowcolor=FG, padding=8)
        style.map("Luma.TCombobox", fieldbackground=[("readonly",PANEL)], foreground=[("readonly",FG)], selectbackground=[("readonly",PANEL)])
        header=tk.Frame(root,bg=BG,padx=32,pady=24);header.pack(fill="x")
        self.logo=tk.PhotoImage(file=str(resource("assets/icon.png")));self.logo=self.logo.subsample(max(1,self.logo.width()//42))
        tk.Label(header,image=self.logo,bg=BG).pack(side="left",padx=(0,10))
        tk.Label(header,text="LUMA",font=("Helvetica",23,"bold"),fg=FG,bg=BG).pack(side="left")
        tk.Label(header,text="SETUP",font=("Helvetica",11),fg=MUTED,bg=BG).pack(side="left",padx=14)
        tk.Frame(root,bg="#292d38",height=1).pack(fill="x",padx=32)
        layout=tk.Frame(root,bg=BG);layout.pack(fill="both",expand=True,padx=32,pady=26)
        sidebar=tk.Frame(layout,bg=BG,width=182);sidebar.pack(side="left",fill="y");sidebar.pack_propagate(False)
        self.labels=[]
        for i,title in enumerate(("Televizor","PIN s televizora","Instalacija")):
            l=tk.Label(sidebar,text=f"0{i+1}   {title}",bg=BG,fg=MUTED,font=("Helvetica",12),anchor="w");l.pack(fill="x",pady=(15,18));self.labels.append(l)
        self.body=tk.Frame(layout,bg=BG,padx=24);self.body.pack(side="left",fill="both",expand=True)
        footer=tk.Frame(root,bg=BG,padx=32,pady=18);footer.pack(fill="x")
        tk.Label(footer,text=("DEMONSTRACIJA · bez povezivanja s TV-om" if demo else "VIDAA · "+VERSION),fg=MUTED,bg=BG,font=("Helvetica",10)).pack(side="left")
        self.button(footer,"Licence",self.licenses,quiet=True).pack(side="right")
        root.bind("<Return>",lambda _:self.enter())
        root.bind("<Command-q>",lambda _:self.close())
        self.search_screen();root.after(100,self.poll);root.after(200,self.search)

    def label(self,parent,text,*,size=14,color=FG,bold=False):
        n=tk.Label(parent,text=text,bg=BG,fg=color,font=("Helvetica",size,"bold" if bold else "normal"),anchor="w",justify="left",wraplength=490);n.pack(anchor="w",fill="x",pady=(0,12));return n

    def button(self,parent,title,command,quiet=False):
        return tk.Button(parent,text=title,command=command,bg=PANEL if quiet else RED,fg=FG,activebackground="#343947" if quiet else "#d93843",activeforeground=FG,font=("Helvetica",12,"normal" if quiet else "bold"),relief="flat",borderwidth=0,highlightthickness=0,cursor="hand2",padx=18,pady=11,disabledforeground="#747986")

    def clear(self,step):
        self.step=step
        for w in self.body.winfo_children():w.destroy()
        for i,l in enumerate(self.labels):l.configure(fg=RED if i==step else (FG if i<step else MUTED))
        self.error=None;self.progress=None;self.primary=None

    def status(self,text):
        if self.error and self.error.winfo_exists():self.error.configure(text=text)

    def search_screen(self):
        self.clear(0)
        self.label(self.body,"LUMA na tvom TV-u.",size=30,bold=True)
        self.label(self.body,"Upali televizor i poveži ga na istu kućnu mrežu kao računalo.",color=MUTED)
        self.tv_choice=tk.StringVar()
        self.combo=ttk.Combobox(self.body,textvariable=self.tv_choice,state="readonly",style="Luma.TCombobox",font=("Helvetica",12));self.combo.pack(fill="x",pady=(12,12))
        self.primary=self.button(self.body,"Prikaži PIN na TV-u",self.connect);self.primary.pack(fill="x",pady=(4,12));self.primary.configure(state="disabled")
        actions=tk.Frame(self.body,bg=BG);actions.pack(fill="x")
        self.button(actions,"Traži ponovno",self.search,quiet=True).pack(side="left")
        self.button(actions,"Unesi IP adresu",self.manual,quiet=True).pack(side="right")
        self.progress=ttk.Progressbar(self.body,mode="indeterminate");self.progress.pack(fill="x",pady=(23,12))
        self.error=self.label(self.body,"Tražim televizor…",size=12,color=MUTED)

    def search(self):
        if self.busy:return
        self.work(self.backend.discover,self.found,"Tražim televizor…")

    def found(self,tvs):
        self.tvs=tvs
        self.combo.configure(values=[tv.name+"  ·  "+tv.host for tv in tvs])
        if tvs:self.combo.current(0)
        self.primary.configure(state="normal" if tvs else "disabled")
        self.status("Odaberi svoj TV i prikaži PIN." if tvs else "TV nije pronađen. Provjeri mrežu ili unesi njegovu IP adresu.")

    def manual(self):
        if self.busy:return
        self.clear(0);self.label(self.body,"Adresa televizora",size=29,bold=True)
        self.label(self.body,"Na TV-u otvori Settings → Network i pronađi IP adresu.",color=MUTED)
        self.ip=tk.Entry(self.body,font=("Helvetica",21),bg=PANEL,fg=FG,insertbackground=FG,relief="flat");self.ip.pack(fill="x",ipady=10,pady=15);self.ip.focus_set()
        self.primary=self.button(self.body,"Pronađi TV",self.identify);self.primary.pack(fill="x",pady=8)
        self.button(self.body,"Natrag",self.back_search,quiet=True).pack(anchor="w",pady=8)
        self.progress=ttk.Progressbar(self.body,mode="indeterminate");self.progress.pack(fill="x",pady=15)
        self.error=self.label(self.body,"",size=12,color=MUTED)

    def back_search(self):
        if not self.busy:self.search_screen();self.search()
    def identify(self):
        host=self.ip.get().strip();self.work(lambda:self.backend.identify(host),self.manual_found,"Provjeravam TV…")
    def manual_found(self,tv):
        self.tv=tv;self.request_pin()
    def connect(self):
        if not self.busy and self.combo.current()>=0:self.tv=self.tvs[self.combo.current()];self.request_pin()

    def request_pin(self):
        self.work(lambda:self.backend.request_pin(self.tv.host),self.pin_screen,"Čekam da televizor prikaže PIN…")

    def pin_screen(self,deadline):
        self.clear(1);self.deadline=deadline
        self.label(self.body,"Unesi PIN s televizora",size=28,bold=True)
        self.label(self.body,self.tv.name+"  ·  "+self.tv.host,color=MUTED)
        self.pin=tk.Entry(self.body,font=("Helvetica",34),justify="center",bg=PANEL,fg=FG,insertbackground=FG,relief="flat",width=8,validate="key",validatecommand=(self.root.register(lambda v:len(v)<=4 and (v.isascii() and v.isdecimal() or not v)),"%P"));self.pin.pack(fill="x",ipady=12,pady=(10,17));self.pin.focus_set()
        self.primary=self.button(self.body,"Instaliraj LUMU",self.install);self.primary.pack(fill="x",pady=8)
        self.retry=self.button(self.body,"Zatraži novi PIN",self.request_pin,quiet=True);self.retry.pack(anchor="w",pady=5)
        self.progress=ttk.Progressbar(self.body,mode="indeterminate");self.progress.pack(fill="x",pady=15)
        self.error=self.label(self.body,"",size=12,color=MUTED)
        self.status("PIN vrijedi približno jednu minutu.")

    def install(self):
        if self.busy:return
        pin=self.pin.get();self.pin.delete(0,"end");self.installing=True
        self.retry.configure(state="disabled")
        self.work(lambda:self.backend.confirm_and_install(pin),self.done,"Potvrđujem PIN i dodajem LUMA ikonu…")

    def done(self,result):
        self.installing=False;self.clear(2)
        self.label(self.body,"LUMA je već na TV-u." if result.already else "LUMA je na tvom TV-u.",size=29,bold=True)
        self.label(self.body,"Pokreni LUMA ikonu i prijavi se Stremio QR-om. Računalo nakon instalacije možeš ugasiti.",color=MUTED)
        self.primary=self.button(self.body,"Otvori LUMU na TV-u",self.launch);self.primary.pack(fill="x",pady=(22,12))
        self.button(self.body,"Zatvori",self.close,quiet=True).pack(fill="x")
        self.progress=ttk.Progressbar(self.body,mode="indeterminate");self.progress.pack(fill="x",pady=20)
        self.error=self.label(self.body,"",size=12,color=MUTED)

    def launch(self):self.work(self.backend.launch,lambda _:self.status("Naredba za pokretanje poslana je televizoru."),"Pokrećem LUMU…")

    def enter(self):
        if self.busy:return
        if self.primary and self.primary.winfo_exists():self.primary.invoke()

    def work(self,fn,success,message):
        if self.busy or self.closed:return
        self.busy=True;self.status(message)
        if self.primary:self.primary.configure(state="disabled")
        if self.progress:self.progress.start(14)
        def worker():
            try:self.events.put((success,fn(),None))
            except Exception as error:self.events.put((success,None,error))
        threading.Thread(target=worker,daemon=True,name="luma-tv-operation").start()

    def poll(self):
        if self.closed:return
        try:
            while True:
                success,result,error=self.events.get_nowait();self.busy=False
                if self.progress and self.progress.winfo_exists():self.progress.stop()
                if self.primary and self.primary.winfo_exists():self.primary.configure(state="normal")
                if error:
                    self.installing=False
                    self.status(str(error) if isinstance(error,SetupError) else "Povezivanje nije uspjelo. Provjeri TV i mrežu pa pokušaj ponovno.")
                    if hasattr(self,"retry") and self.retry.winfo_exists():self.retry.configure(state="normal")
                    if isinstance(error,SetupError) and error.uncertain:
                        self.primary.configure(text="Provjeri instalaciju",command=lambda:self.work(self.backend.verify,self.done,"Provjeravam LUMA ikonu…"))
                else:success(result)
        except queue.Empty:pass
        self.root.after(100,self.poll)

    def licenses(self):
        w=tk.Toplevel(self.root);w.title("LUMA Setup · licence");w.geometry("650x460")
        text=tk.Text(w,wrap="word",font=("Helvetica",11),bg=PANEL,fg=FG,padx=18,pady=18);text.pack(fill="both",expand=True)
        for name in ("SIDEE-MIT.txt","PAHO-LICENSE.txt"):
            text.insert("end",name+"\n\n"+resource("licenses/"+name).read_text(encoding="utf-8")+"\n\n")
        text.configure(state="disabled")

    def close(self):
        if self.installing and not messagebox.askyesno("Instalacija traje","TV još provjerava instalaciju. Želiš li zatvoriti program?",parent=self.root):return
        self.closed=True;self.backend.close();self.root.destroy()

def run(demo=False):
    root=tk.Tk()
    try:backend=DemoInstaller() if demo else Installer()
    except Exception as error:
        root.withdraw();messagebox.showerror("LUMA Setup",str(error) if isinstance(error,SetupError) else "Program se ne može pripremiti. Provjeri pristup svojoj korisničkoj mapi.");root.destroy();return 1
    Window(root,backend,demo);root.mainloop();return 0
