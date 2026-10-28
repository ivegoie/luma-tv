package io.github.ivegoie.lumatv;

import android.app.Activity;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.view.KeyEvent;
import android.view.View;
import android.view.WindowManager;
import android.webkit.CookieManager;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceError;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;

/** Installed TV launcher for hosted LUMA. No JavaScript/native bridge is exposed. */
public final class MainActivity extends Activity {
    private static final String APP_URL = "https://ivegoie.github.io/luma-tv/index.html";
    private WebView web;
    private LinearLayout root;
    private View errorPanel;
    @Override public void onCreate(Bundle saved) {
        super.onCreate(saved);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_FULLSCREEN | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY);
        root = new LinearLayout(this); root.setOrientation(LinearLayout.VERTICAL); root.setBackgroundColor(Color.rgb(11,12,16));
        web = new WebView(this); web.setBackgroundColor(Color.BLACK); web.setFocusable(true); web.setFocusableInTouchMode(true);
        WebSettings settings = web.getSettings();
        settings.setJavaScriptEnabled(true); settings.setDomStorageEnabled(true); settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setAllowFileAccess(false); settings.setAllowContentAccess(false); settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        CookieManager.getInstance().setAcceptThirdPartyCookies(web, false);
        web.setWebChromeClient(new WebChromeClient());
        web.setWebViewClient(new WebViewClient() {
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                if (!request.isForMainFrame()) return false;
                Uri url=request.getUrl();
                return !("https".equals(url.getScheme()) && "ivegoie.github.io".equals(url.getHost()) && url.getPath()!=null && url.getPath().startsWith("/luma-tv/"));
            }
            @Override public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) { if(request.isForMainFrame()) showError(); }
        });
        root.addView(web, new LinearLayout.LayoutParams(-1,-1)); setContentView(root);
        web.loadUrl(APP_URL); web.requestFocus();
    }
    private void showError() {
        if(errorPanel!=null) return;
        LinearLayout panel=new LinearLayout(this);panel.setOrientation(LinearLayout.VERTICAL);panel.setPadding(80,80,80,80);
        TextView text=new TextView(this);text.setText("LUMA se ne može učitati. Provjeri internetsku vezu.");text.setTextColor(Color.WHITE);text.setTextSize(22);
        Button retry=new Button(this);retry.setText("Pokušaj ponovno");retry.setOnClickListener(v->{root.removeView(errorPanel);errorPanel=null;web.setVisibility(View.VISIBLE);web.loadUrl(APP_URL);web.requestFocus();});
        panel.addView(text);panel.addView(retry);errorPanel=panel;web.setVisibility(View.GONE);root.addView(panel);retry.requestFocus();
    }
    private void key(int code) {
        web.evaluateJavascript("(function(){var e=new KeyboardEvent('keydown',{key:'"+(code==27?"Escape":"Media")+"',bubbles:true,cancelable:true});Object.defineProperty(e,'keyCode',{value:"+code+"});Object.defineProperty(e,'which',{value:"+code+"});document.dispatchEvent(e);})()",null);
    }
    @Override public void onBackPressed() { if(errorPanel!=null) finish(); else key(27); }
    @Override public boolean onKeyDown(int code,KeyEvent event) {
        if(errorPanel==null){switch(code){case KeyEvent.KEYCODE_MEDIA_PLAY:key(415);return true;case KeyEvent.KEYCODE_MEDIA_PAUSE:key(19);return true;case KeyEvent.KEYCODE_MEDIA_PLAY_PAUSE:key(179);return true;case KeyEvent.KEYCODE_MEDIA_STOP:key(413);return true;default:break;}}
        return super.onKeyDown(code,event);
    }
    @Override protected void onPause(){if(web!=null)web.onPause();super.onPause();}
    @Override protected void onResume(){super.onResume();if(web!=null)web.onResume();}
    @Override protected void onDestroy(){if(web!=null){web.stopLoading();web.destroy();}super.onDestroy();}
}
