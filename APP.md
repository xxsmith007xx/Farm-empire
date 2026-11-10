# Farm Empire as a phone app

The game is wrapped as a native Android and iOS app with [Capacitor](https://capacitorjs.com/) 8. The same web code runs inside the app, with native extras:

- **Haptics:** light taps when hatching, firmer buzzes for purchases, drones and gifts, and a "success" pattern for new eggs, expansions and achievements.
- **Android back button:** closes a pop-up, then returns to the Farm tab, then minimises the app.
- **Durable saves:** the save is also kept in native storage (`@capacitor/preferences`), because iOS can clear web storage when a phone runs low on space.
- **Phone polish:** portrait-only layout, a branded splash screen and status bar, and an app icon.

All of this lives in `js/native.js` and does nothing in a normal browser, so the website version is unchanged.

## Try it on an Android phone (no tools needed)

Every push and pull request runs the **App build** workflow in GitHub Actions, which builds a test APK.

1. On GitHub, open **Actions → App build**, then pick the latest successful run.
2. Download **farm-empire-debug-apk** (under *Artifacts*) and unzip it.
3. Copy `app-debug.apk` to your phone and open it. Android will ask you to allow installing from that source.

This is a *debug* build for testing. The Play Store needs a signed release build (see below).

## Building on your computer

You need Node.js 22+. Then:

```sh
npm install
npm run sync      # copies the game into www/ and into the android/ and ios/ projects
npm run android   # sync, then open Android Studio (install it first)
npm run ios       # sync, then open Xcode (Mac only)
```

From Android Studio or Xcode, press ▶ to run on a connected phone or an emulator/simulator. After changing any game file, run `npm run sync` again; the native projects get a copy of the web files and won't see changes until you do.

How the build works:
- `scripts/build-web.js` copies the game into `www/`, adds the Capacitor scripts (app only) and checks that every file `index.html` and `js/art.js` reference exists.
- `www/` is generated, so it isn't committed. The `android/` and `ios/` folders *are* committed: they're normal native projects you can customise.

## Icons and splash screen

The source images are in `assets/`:
- `icon-only.png`: the app icon (1024 × 1024).
- `icon-foreground.png` + `icon-background.png`: Android's adaptive icon layers.
- `splash.png` / `splash-dark.png`: the launch screen (2732 × 2732; keep the logo in the middle third).

They're placeholders made from the game's sprites. To use new artwork, replace those files and run:

```sh
npx @capacitor/assets generate --iconBackgroundColor '#174b43' --iconBackgroundColorDark '#174b43' --splashBackgroundColor '#174b43' --splashBackgroundColorDark '#174b43' --android --ios
```

## App identity

| Setting | Value | Where |
| --- | --- | --- |
| App ID / bundle ID | `io.github.xxsmith007xx.farmempire` | `capacitor.config.json`, `android/app/build.gradle`, Xcode project |
| App name | Farm Empire | `capacitor.config.json`, `android/app/src/main/res/values/strings.xml`, `ios/App/App/Info.plist` |
| Version | 1.0 (build 1) | `android/app/build.gradle` (`versionName` / `versionCode`), Xcode → App target → General |

**The app ID can't change after the app is first published**, so decide on it before your first store upload. It's based on your GitHub Pages domain, which you own. If you'd rather use your own domain (e.g. `com.yourstudio.farmempire`), change it everywhere listed above *before* publishing. Bump the version and build number for every store upload.

## Publishing checklist

**Both stores**
- [ ] Final app icon, splash screen and store screenshots
- [ ] Privacy policy URL. The game stores progress only on the device and collects no data, which keeps this simple.
- [ ] Decide the audience. If the game is aimed at children, the stricter kids' rules apply: Apple's Kids category, Google Play's Families policy and COPPA in the US. Check them before adding ads, analytics or purchases.
- [ ] Content rating questionnaire (IARC on Google Play, age rating in App Store Connect)

**Google Play** (one-time $25 developer account)
- [ ] Create an upload key and keep it safe. Android Studio: *Build → Generate Signed App Bundle*.
- [ ] Build a release **App Bundle (.aab)** and upload it in Play Console. New personal accounts must run a closed test with testers before going to production.

**Apple App Store** ($99/year Apple Developer Program, and a Mac with Xcode)
- [ ] Set your Team in Xcode → App target → Signing & Capabilities.
- [ ] *Product → Archive*, then upload to App Store Connect and test with TestFlight.

**Optional iOS check in CI:** run the **App build** workflow manually (Actions → App build → *Run workflow*) and tick "Also check that the iOS app compiles". It builds for the simulator on a macOS runner. On private repositories, macOS minutes count 10× against GitHub's free allowance, so it doesn't run automatically.
