import UIKit

enum PrivacyShield {
    private static let viewTag = 948_310

    static func show(in window: UIWindow?) {
        guard let window, window.viewWithTag(viewTag) == nil else { return }

        let shield = UIView(frame: window.bounds)
        shield.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        shield.backgroundColor = UIColor(
            red: 248 / 255,
            green: 244 / 255,
            blue: 236 / 255,
            alpha: 1
        )
        shield.tag = viewTag

        let title = UILabel()
        title.text = "DiaryDock"
        title.textColor = UIColor(red: 32 / 255, green: 53 / 255, blue: 42 / 255, alpha: 1)
        title.font = .systemFont(ofSize: 28, weight: .semibold)
        title.translatesAutoresizingMaskIntoConstraints = false
        shield.addSubview(title)
        NSLayoutConstraint.activate([
            title.centerXAnchor.constraint(equalTo: shield.centerXAnchor),
            title.centerYAnchor.constraint(equalTo: shield.centerYAnchor)
        ])

        window.addSubview(shield)
    }

    static func hide(from window: UIWindow?) {
        window?.viewWithTag(viewTag)?.removeFromSuperview()
    }
}
