const { withAppBuildGradle } = require('@expo/config-plugins');

module.exports = function withReleaseSigning(config) {
  return withAppBuildGradle(config, cfg => {
    if (cfg.modResults.language !== 'groovy') {
      throw new Error('[withReleaseSigning] Expected Groovy app/build.gradle');
    }
    let src = cfg.modResults.contents;
    const definitions = String.raw`
// Dedicated Myket release key. Never commit signing credentials.
def MYKET_STORE_FILE = System.getenv("MYKET_STORE_FILE")
def MYKET_STORE_PASSWORD = System.getenv("MYKET_STORE_PASSWORD")
def MYKET_KEY_ALIAS = System.getenv("MYKET_KEY_ALIAS")
def MYKET_KEY_PASSWORD = System.getenv("MYKET_KEY_PASSWORD")
`;
    if (!src.includes('def MYKET_STORE_FILE')) src = definitions + src;

    // Locate buildTypes.release specifically, not the first "release {" anywhere.
    const buildTypes = /buildTypes\s*\{/g;
    const block = buildTypes.exec(src);
    if (!block) throw new Error('[withReleaseSigning] buildTypes missing');
    const releaseMatch = /\brelease\s*\{/.exec(src.slice(block.index + block[0].length));
    if (!releaseMatch) throw new Error('[withReleaseSigning] buildTypes.release missing');
    const releaseStart = block.index + block[0].length + releaseMatch.index;
    const brace = src.indexOf('{', releaseStart);
    let depth = 0, end = -1;
    for (let i = brace; i < src.length; i++) {
      if (src[i] === '{') depth++;
      else if (src[i] === '}' && --depth === 0) { end = i; break; }
    }
    if (end < 0) throw new Error('[withReleaseSigning] Unterminated release block');

    if (!/myketRelease\s*\{/.test(src)) {
      const android = /android\s*\{/;
      if (!android.test(src)) throw new Error('[withReleaseSigning] android block missing');
      src = src.replace(android, m => m + String.raw`
    signingConfigs {
        myketRelease {
            if (MYKET_STORE_FILE) {
                storeFile file(MYKET_STORE_FILE)
                storePassword MYKET_STORE_PASSWORD
                keyAlias MYKET_KEY_ALIAS
                keyPassword MYKET_KEY_PASSWORD
            }
        }
    }
`);
    }

    // Recalculate after insertion. Expo's default release config is DEBUG;
    // it must be removed, not merely preceded by a release config.
    const buildTypesIndex = src.search(/buildTypes\s*\{/);
    const releaseIndex = src.indexOf('release {', buildTypesIndex);
    if (releaseIndex < 0) throw new Error('[withReleaseSigning] release block disappeared');
    const releaseBrace = src.indexOf('{', releaseIndex);
    let level = 0, releaseEnd = -1;
    for (let i = releaseBrace; i < src.length; i++) {
      if (src[i] === '{') level++;
      else if (src[i] === '}' && --level === 0) { releaseEnd = i; break; }
    }
    if (releaseEnd < 0) throw new Error('[withReleaseSigning] release block invalid');
    let releaseBody = src.slice(releaseBrace + 1, releaseEnd);
    releaseBody = releaseBody.replace(/^\s*signingConfig\s+signingConfigs\.(?:debug|myketRelease)\s*$/gm, '');
    releaseBody = String.raw`
            if (MYKET_STORE_FILE) {
                signingConfig signingConfigs.myketRelease
            } else if (System.getenv("GITHUB_ACTIONS") == "true" && System.getenv("MYKET_BUILD") == "true") {
                throw new GradleException("Myket release signing keystore is missing")
            }
` + releaseBody;
    src = src.slice(0, releaseBrace + 1) + releaseBody + src.slice(releaseEnd);
    cfg.modResults.contents = src;
    return cfg;
  });
};
