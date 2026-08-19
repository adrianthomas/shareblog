// swift-tools-version:5.9
import PackageDescription

let package = Package(
    name: "ShareblogKit",
    platforms: [.iOS(.v17)],
    products: [
        .library(name: "ShareblogKit", targets: ["ShareblogKit"])
    ],
    targets: [
        .target(name: "ShareblogKit")
    ]
)
