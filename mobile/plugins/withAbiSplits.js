const { withAppBuildGradle } = require('expo/config-plugins');

// این پلاگین سه نوع APK جدا می‌سازد: یونیورسال (همه‌منظوره) + arm64-v8a (سبک،
// گوشی‌های جدید) + armeabi-v7a (گوشی‌های قدیمی‌تر). چون universalApk=true است،
// فایل یونیورسال هم همیشه ساخته می‌شود و اگر مدل گوشی نامشخص بود همان روی همه کار می‌کند.
//
// نکتهٔ مهم: این نسخه از androidComponents.onVariants (Variant API جدید AGP 8.x)
// استفاده می‌کند، نه از applicationVariants.all/com.android.build.OutputFile قدیمی
// که در AGP 8 کاملاً حذف شده و باعث throw شدن در فاز afterEvaluate می‌شد.
const SPLITS_BLOCK = `
    // ===== ABI Splits (khatyar) =====
    splits {
        abi {
            enable true
            reset()
            include "armeabi-v7a", "arm64-v8a"
            universalApk true
        }
    }
    // ===== پایان ABI Splits =====
`;

const VARIANT_API_BLOCK = `
androidComponents {
    onVariants(selector().all()) { variant ->
        variant.outputs.forEach { output ->
            def abiCodes = ["armeabi-v7a": 1, "arm64-v8a": 2, "x86": 3, "x86_64": 4]
            def abiFilter = output.filters.find { it.filterType == com.android.build.api.variant.FilterConfiguration.FilterType.ABI }
            if (abiFilter != null) {
                def code = abiCodes.get(abiFilter.identifier)
                if (code != null) {
                    def baseVersionCode = variant.outputs.first().versionCode.getOrElse(1)
                    output.versionCode.set(baseVersionCode * 10 + code)
                }
            }
        }
    }
}
`;

module.exports = function withAbiSplits(config) {
  return withAppBuildGradle(config, (cfg) => {
    if (cfg.modResults.language !== 'groovy') return cfg;
    let src = cfg.modResults.contents;

    if (src.includes('// ===== ABI Splits (khatyar) =====')) return cfg;

    const marker = /android\s*\{/;
    if (!marker.test(src)) return cfg;
    src = src.replace(marker, (m) => `${m}\n${SPLITS_BLOCK}`);

    // androidComponents یک بلوک top-level جدا از android { } است، نه داخلش.
    src = src + '\n' + VARIANT_API_BLOCK;

    cfg.modResults.contents = src;
    return cfg;
  });
};
