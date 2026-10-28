"""LUMA Setup desktop entry point."""
import sys
if __name__ == "__main__":
    if "--gui-self-test" in sys.argv:
        import tkinter as tk
        from luma_setup.gui import Window, DemoInstaller
        root=tk.Tk();root.withdraw()
        window=Window(root,DemoInstaller(),True)
        root.after(2500,root.quit);root.mainloop()
        assert window.tvs, 'Demo TV not displayed'
        window.tv=window.tvs[0];window.pin_screen(__import__('time').monotonic()+60)
        window.pin.insert(0,'1234');assert window.pin.get()=='1234'
        window.done(__import__('luma_setup.installer',fromlist=['Result']).Result(False,1))
        root.update_idletasks();window.close()
        raise SystemExit(0)
    if "--self-test" in sys.argv:
        from luma_setup.installer import self_test
        raise SystemExit(self_test())
    from luma_setup.gui import run
    raise SystemExit(run(demo="--demo" in sys.argv))
