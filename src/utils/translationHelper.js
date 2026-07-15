export function getTranslatedProjectName(obj, selectedLanguage) {
  if (!obj) return "";
  const localizedNames = obj.localized_names || {};

  // Preserve existing behaviour for English, Hindi, and Tamil exactly as they are currently working
  if (selectedLanguage === "en" || selectedLanguage === "hi" || selectedLanguage === "ta") {
    const englishName = obj.name || localizedNames['en'] || "";
    const activeLang = (selectedLanguage === 'en') ? 'hi' : selectedLanguage;
    const localName = localizedNames[activeLang];
    if (localName && localName !== englishName) {
      return `${localName} (${englishName})`;
    }
    return localName || englishName;
  }

  // Fallback Rules for the remaining 9 languages:
  // 1. localized_names[selectedLanguage]
  if (selectedLanguage && typeof localizedNames[selectedLanguage] === "string" && localizedNames[selectedLanguage].trim() !== "") {
    return localizedNames[selectedLanguage];
  }

  // 2. localized_names["en"]
  if (typeof localizedNames["en"] === "string" && localizedNames["en"].trim() !== "") {
    return localizedNames["en"];
  }

  // 3. name
  if (typeof obj.name === "string" && obj.name.trim() !== "") {
    return obj.name;
  }

  // 4. empty string
  return "";
}
