#import <Capacitor/Capacitor.h>

CAP_PLUGIN(ExternalBrowserPlugin, "ExternalBrowser",
    CAP_PLUGIN_METHOD(openUrl, CAPPluginReturnPromise);
)
