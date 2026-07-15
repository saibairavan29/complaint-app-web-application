CATEGORY_TRANSLATIONS = {
    'hi': {
        'water': 'पानी (Water) 🚰',
        'electricity': 'बिजली (Electricity) ⚡',
        'toilet': 'शौचालय (Toilet) 🚽',
        'accommodation': 'आवास (Accommodation) 🛏',
        'food': 'भोजन (Food) 🍽',
        'safety': 'सुरक्षा (Safety) 🦺',
        'other': 'अन्य (Other) 📦'
    },
    'ta': {
        'water': 'தண்ணீர் (Water) 🚰',
        'electricity': 'மின்சாரம் (Electricity) ⚡',
        'toilet': 'கழிப்பறை (Toilet) 🚽',
        'accommodation': 'தங்குமிடம் (Accommodation) 🛏',
        'food': 'உணவு (Food) 🍽',
        'safety': 'பாதுகாப்பு (Safety) 🦺',
        'other': 'இதர (Other) 📦'
    },
    'te': {
        'water': 'నీరు (Water) 🚰',
        'electricity': 'విద్యుత్ (Electricity) ⚡',
        'toilet': 'టాయిలెట్ (Toilet) 🚽',
        'accommodation': 'వసతి (Accommodation) 🛏',
        'food': 'ఆహారం (Food) 🍽',
        'safety': 'భద్రత (Safety) 🦺',
        'other': 'ఇతరాలు (Other) 📦'
    },
    'kn': {
        'water': 'ನೀರು (Water) 🚰',
        'electricity': 'ವಿದ್ಯುತ್ (Electricity) ⚡',
        'toilet': 'ಶೌಚಾಲಯ (Toilet) 🚽',
        'accommodation': 'ವಸತಿ (Accommodation) 🛏',
        'food': 'ಆಹಾರ (Food) 🍽',
        'safety': 'ಸುರಕ್ಷತೆ (Safety) 🦺',
        'other': 'ಇತರೆ (Other) 📦'
    },
    'ml': {
        'water': 'വെള്ളം (Water) 🚰',
        'electricity': 'വൈദ്യുതി (Electricity) ⚡',
        'toilet': 'ശുചിമുറി (Toilet) 🚽',
        'accommodation': 'താമസം (Accommodation) 🛏',
        'food': 'ഭക്ഷണം (Food) 🍽',
        'safety': 'സുരക്ഷ (Safety) 🦺',
        'other': 'മറ്റുള്ളവ (Other) 📦'
    }
}

def get_bilingual_name(obj, lang):
    if not obj:
        return ""
    english_name = obj.name or ""
    if not lang or lang == 'en':
        return english_name
    localized_names = obj.localized_names or {}
    local_name = localized_names.get(lang)
    if local_name and local_name != english_name:
        return f"{local_name} ({english_name})"
    return local_name or english_name

def get_bilingual_category(cat_key, lang):
    if not cat_key:
        return ""
    if not lang or lang == 'en':
        return cat_key.capitalize()
    translations = CATEGORY_TRANSLATIONS.get(lang, {})
    bilingual_val = translations.get(cat_key.lower())
    if bilingual_val:
        return bilingual_val
    return cat_key.capitalize()
