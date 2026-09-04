import Capacitor

final class AppViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        bridge?.registerPluginType(DiaryDockShareImportPlugin.self)
    }
}
