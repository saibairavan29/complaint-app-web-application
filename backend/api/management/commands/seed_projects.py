from django.core.management.base import BaseCommand
from api.models import Project, Location, Complaint

class Command(BaseCommand):
    help = "Seeds the database with the company's master project list and mock camp locations"

    def handle(self, *args, **options):
        import os
        from django.conf import settings
        from django.core.cache import cache

        # Ensure logs directory exists
        log_dir = os.path.join(settings.BASE_DIR, 'logs')
        os.makedirs(log_dir, exist_ok=True)
        log_filepath = os.path.join(log_dir, 'project_migration.log')

        # Start fresh log file
        with open(log_filepath, 'w', encoding='utf-8') as f:
            f.write("=== PROJECT MIGRATION AUDIT REPORT ===\n")

        projects_translations = {
            "KUDANKULAM PROJECT RB 3&4": {
                'en': "KUDANKULAM PROJECT RB 3&4",
                'hi': "कुडनकुलम परियोजना RB 3&4",
                'ta': "கூடங்குளம் திட்டம் RB 3&4",
                'te': "కూడంకుళం ప్రాజెక్ట్ RB 3&4",
                'ml': "കൂടംകുളം പ്രോജക്റ്റ് RB 3&4",
                'kn': "ಕೂಡಂಕುಳಂ ಯೋಜನೆ RB 3&4",
                'mr': "कुडनकुलम प्रकल्प RB 3&4",
                'bn': "কুডনকুলাম প্রকল্প RB 3&4",
                'gu': "કુડનકુલમ પ્રોજેક્ટ RB 3&4",
                'pa': "ਕੁਡਨਕੁਲਮ ਪ੍ਰੋਜੈਕਟ RB 3&4",
                'or': "କୁଡନକୁଲାମ ପ୍ରକଳ୍ପ RB 3&4",
                'as': "কূডনকুলাম প্ৰকল্প RB 3&4"
            },
            "KUDANKULAM PROJECT RB 5&6": {
                'en': "KUDANKULAM PROJECT RB 5&6",
                'hi': "कुडनकुलम परियोजना RB 5&6",
                'ta': "கூடங்குளம் திட்டம் RB 5&6",
                'te': "కూడంకుళం ప్రాజెక్ట్ RB 5&6",
                'ml': "കൂടംകുളം പ്രോജക്റ്റ് RB 5&6",
                'kn': "ಕೂಡಂಕುಳಂ ಯೋಜನೆ RB 5&6",
                'mr': "कुडनकुलम प्रकल्प RB 5&6",
                'bn': "কুডনকুলাম প্রকল্প RB 5&6",
                'gu': "કુડનકુલમ પ્રોજેક્ટ RB 5&6",
                'pa': "ਕੁਡਨਕੁਲਮ ਪ੍ਰੋਜੈਕਟ RB 5&6",
                'or': "କୁଡନକୁଲାମ ପ୍ରକଳ୍ପ RB 5&6",
                'as': "কূডনকুলাম প্ৰকল্প RB 5&6"
            },
            "KUDANKULAM PROJECT 5&6 MEP": {
                'en': "KUDANKULAM PROJECT 5&6 MEP",
                'hi': "कुडनकुलम परियोजना 5&6 MEP",
                'ta': "கூடங்குளம் திட்டம் 5&6 MEP",
                'te': "కూడంకుళం ప్రాజెక్ట్ 5&6 MEP",
                'ml': "കൂടംകുളം പ്രോജക്റ്റ് 5&6 MEP",
                'kn': "ಕೂಡಂಕುಳಂ ಯೋಜನೆ 5&6 MEP",
                'mr': "कुडनकुलम प्रकल्प 5&6 MEP",
                'bn': "কুডনকুলাম প্রকল্প 5&6 MEP",
                'gu': "કુડનકુલમ પ્રોજેક્ટ 5&6 MEP",
                'pa': "ਕੁਡਨਕੁਲਮ ਪ੍ਰੋਜੈਕਟ 5&6 MEP",
                'or': "କୁଡନକୁଲାମ ପ୍ରକଳ୍ପ 5&6 MEP",
                'as': "কূডনকুলাম প্ৰকল্প 5&6 MEP"
            },
            "VIZAG VESSEL PROJECT": {
                'en': "VIZAG VESSEL PROJECT",
                'hi': "विजाग वेसल परियोजना",
                'ta': "வைசாக் வெசல் திட்டம்",
                'te': "వైజాగ్ వెసెల్ ప్రాజెక్ట్",
                'ml': "വൈസാഗ് വെസൽ പ്രോജക്റ്റ്",
                'kn': "వైజాగ్ వెసెಲ್ ಯೋಜನೆ",
                'mr': "विजाग वेसल प्रकल्प",
                'bn': "ভাইজাগ ভেসেল প্রকল্প",
                'gu': "વાઈઝેગ વેસલ પ્રોજેક્ટ",
                'pa': "ਵਾਈਜ਼ੈਗ ਵੈਸਲ ਪ੍ਰੋਜੈਕਟ",
                'or': "ଭାଇଜାଗ୍ ଭେସେଲ୍ ପ୍ରକଳ୍ପ",
                'as': "ভাইজাগ ভেসেল প্ৰকল্প"
            },
            "Control Building at BARC Tarapur": {
                'en': "Control Building at BARC Tarapur",
                'hi': "BARC तारापुर में नियंत्रण भवन",
                'ta': "பார்சி தாராபூரில் கட்டுப்பாட்டு கட்டிடம்",
                'te': "BARC తారాపూర్‌లోని నియంత్రణ భవనం",
                'ml': "BARC താരാപ്പൂരിലെ നിയന്ത്രണ കെട്ടിടം",
                'kn': "BARC ತಾರಾಪುರದಲ್ಲಿನ ನಿಯಂತ್ರಣ ಕಟ್ಟಡ",
                'mr': "BARC तारापूर येथील नियंत्रण इमारत",
                'bn': "BARC তারাপুরে নিয়ন্ত্রণ ভবন",
                'gu': "BARC તારાપુર ખાતે નિયંત્રણ ભવન",
                'pa': "BARC ਤਾਰਾਪੁਰ ਵਿਖੇ ਨਿਯੰਤਰਣ ਇਮਾਰਤ",
                'or': "BARC ତାରାପୁരଠାରେ ନିୟନ୍ତ୍ରଣ ଗୃହ",
                'as': "BARC তাৰাপুৰত থকা নিয়ন্ত্ৰণ ভৱন"
            },
            "SEA BIRD PROJECT-MWc04": {
                'en': "SEA BIRD PROJECT-MWc04",
                'hi': "सी बर्ड परियोजना-MWc04",
                'ta': "சீ பேர்ட் திட்டம்-MWc04",
                'te': "సీ బర్డ్ ప్రాజెక్ట్-MWc04",
                'ml': "സീ ബേർഡ് പ്രോജക്റ്റ്-MWc04",
                'kn': "ಸೀ ಬರ್ಡ್ ಯೋಜನೆ-MWc04",
                'mr': "सी बर्ड प्रकल्प-MWc04",
                'bn': "সী বার্ড প্রকল্প-MWc04",
                'gu': "સી બર્ડ પ્રોજેક્ટ-MWc04",
                'pa': "ਸੀ ਬਰਡ ਪ੍ਰੋਜੈਕਟ-MWc04",
                'or': "ସୀ ବର୍ଡ ପ୍ରକଳ୍ପ-MWc04",
                'as': "সী বার্ড প্ৰকল্প-MWc04"
            },
            "KUDANKULAM PROJECT HTS & SFSF": {
                'en': "KUDANKULAM PROJECT HTS & SFSF",
                'hi': "कुडनकुलम परियोजना HTS और SFSF",
                'ta': "கூடங்குளம் திட்டம் HTS & SFSF",
                'te': "కూడంకుళం ప్రాజెక్ట్ HTS & SFSF",
                'ml': "കൂടംകുളം പ്രോജക്റ്റ് HTS & SFSF",
                'kn': "ಕೂಡಂಕುಳಂ ಯೋಜನೆ HTS & SFSF",
                'mr': "कुडनकुलम प्रकल्प HTS & SFSF",
                'bn': "কুডনকুলাম প্রকল্প HTS & SFSF",
                'gu': "કુડનકુલમ પ્રોજેક્ટ HTS & SFSF",
                'pa': "ਕੁਡਨਕੁਲਮ ਪ੍ਰੋਜੈਕਟ HTS & SFSF",
                'or': "କୁଡନକୁଲାମ ପ୍ରକଳ୍ପ HTS & SFSF",
                'as': "কূডনকুলাম প্ৰকল্প HTS & SFSF"
            },
            "GHAVP": {
                'en': "GHAVP",
                'hi': "जीएचएवीपी",
                'ta': "ஜி.ஹெச்.ஏ.வி.பி",
                'te': "జీహెచ్ఏవీపీ",
                'ml': "ജി.എച്ച്.എ.വി.പി.",
                'kn': "ಜಿ.ಎಚ್.ಎ.ವಿ.പി.",
                'mr': "जीएचएव्हीपी",
                'bn': "জিএইচএভিপি",
                'gu': "જીએચએવીપી",
                'pa': "ਜੀ.ਐਚ.ਏ.ਵੀ.ਪੀ.",
                'or': "ଜିଏଚଏଭିପି",
                'as': "জিএইচএভিপি"
            },
            "MTHL extension": {
                'en': "MTHL extension",
                'hi': "MTHL विस्तार",
                'ta': "எம்டிஎச்எல் விரிவாக்கம்",
                'te': "MTHL విస్తరణ",
                'ml': "MTHL വിപുലീകരണം",
                'kn': "MTHL ವಿಸ್ತರಣೆ",
                'mr': "MTHL विस्तार",
                'bn': "MTHL সম্প্রসারণ",
                'gu': "MTHL વિસ્તરણ",
                'pa': "MTHL ਵਿਸਤਾਰ",
                'or': "MTHL ସମ୍ପ୍ରସାରଣ",
                'as': "MTHL সম্প্ৰসাৰণ"
            },
            "Sitamma sagar": {
                'en': "Sitamma sagar",
                'hi': "सीताम्मा सागर",
                'ta': "சீதம்மா சாகர்",
                'te': "సీతమ్మ సాగర్",
                'ml': "സീതമ്മ സാഗർ",
                'kn': "ಸೀತಮ್ಮ ಸಾಗರ",
                'mr': "सीताम्मा सागर",
                'bn': "সীতাম্মা সাগর",
                'gu': "સીતામ્મા સાગર",
                'pa': "ਸੀਤਾਮਾ ਸਾਗਰ",
                'or': "ସୀତାମ୍ମା ସାଗର",
                'as': "সীতাম্মা সাগৰ"
            },
            "Teesta Sikkim": {
                'en': "Teesta Sikkim",
                'hi': "तीस्ता सिक्किम",
                'ta': "தீஸ்தா சிக்கிம்",
                'te': "తీస్తా సిక్కిం",
                'ml': "തീസ്ത സിക്കിം",
                'kn': "ತೀಸ್ತಾ ಸಿಕ್ಕಿಂ",
                'mr': "तीस्ता सिक्कीम",
                'bn': "তিস্তা সিকিম",
                'gu': "તીસ્તા સિક્કિમ",
                'pa': "ਤੀਸਤਾ ਸਿੱਕਮ",
                'or': "ତିସ୍ତା ସିକ୍କିମ",
                'as': "তিস্তা ছিকিম"
            },
            "Kopili HEP": {
                'en': "Kopili HEP",
                'hi': "कोपिली HEP",
                'ta': "கோபிலி HEP",
                'te': "కొపిలి HEP",
                'ml': "കോപ്പിലി HEP",
                'kn': "ಕೊಪಿಲಿ HEP",
                'mr': "कोपिली HEP",
                'bn': "কপিলি HEP",
                'gu': "કોપિલી HEP",
                'pa': "ਕੋਪੀਲੀ HEP",
                'or': "କୋପିଲି HEP",
                'as': "কপিলী HEP"
            },
            "RVNL 2": {
                'en': "RVNL 2",
                'hi': "आरवीएनएल 2",
                'ta': "ஆர்.வி.என்.எல் 2",
                'te': "ఆర్వీఎన్ఎల్ 2",
                'ml': "ആർ.വി.എൻ.എൽ 2",
                'kn': "ಆರ್‌ವಿಎನ್‌ಎಲ್ 2",
                'mr': "आरव्हीएनएल 2",
                'bn': "আরভিএনএল 2",
                'gu': "આરવીએનએલ 2",
                'pa': "ਆਰਵੀਐਨਐਲ 2",
                'or': "ଆରଭିଏନଏଲ 2",
                'as': "আৰভিএনএল 2"
            },
            "RVNL-pkg 4": {
                'en': "RVNL-pkg 4",
                'hi': "आरवीएनएल-पैकेज 4",
                'ta': "ஆர்.வி.என்.எல்-தொகுதி 4",
                'te': "RVNL-ప్యాకేజీ 4",
                'ml': "RVNL-പാക്കേജ് 4",
                'kn': "RVNL-ਪ್ಯಾಕೇಜ್ 4",
                'mr': "RVNL-पॅकेज 4",
                'bn': "RVNL-প্যাকেজ 4",
                'gu': "RVNL-પેકેજ 4",
                'pa': "RVNL-ਪੈਕੇਜ 4",
                'or': "RVNL-ਪ୍ୟାକେଜ୍ 4",
                'as': "RVNL-পেকেজ 4"
            },
            "Gandhi Sagar": {
                'en': "Gandhi Sagar",
                'hi': "गांधी सागर",
                'ta': "காந்தி சாகர்",
                'te': "గాంధీ సాగర్",
                'ml': "ഗാന്ധി സാഗർ",
                'kn': "ಗಾಂಧಿ ಸಾಗರ",
                'mr': "गांधी सागर",
                'bn': "গান্ধী সাগর",
                'gu': "ગાંધી સાગર",
                'pa': "ਗਾਂਧੀ ਸਾਗਰ",
                'or': "ଗାନ୍ଧୀ ସାଗର",
                'as': "গান্ধী সাগৰ"
            },
            "Pakaldul HEP": {
                'en': "Pakaldul HEP",
                'hi': "पक्कलदुल HEP",
                'ta': "பகல் துல் HEP",
                'te': "పకల్దుల్ HEP",
                'ml': "പക്കൽദുൽ HEP",
                'kn': "ಪಕಲ್ದುಲ್ HEP",
                'mr': "पक्कलदुल HEP",
                'bn': "পাকালদুল HEP",
                'gu': "પાકલદુલ HEP",
                'pa': "ਪਾਕਲਦੁਲ HEP",
                'or': "ପାକାଲଡୁଲ୍ HEP",
                'as': "পাকালদুল HEP"
            },
            "Dibang": {
                'en': "Dibang",
                'hi': "दिबांग",
                'ta': "திபாங்",
                'te': "దిబాంగ్",
                'ml': "ദിബാംഗ്",
                'kn': "ದಿಬಾಂಗ್",
                'mr': "दिबांग",
                'bn': "দিবাং",
                'gu': "દિબાંગ",
                'pa': "ਦਿਬਾਂਗ",
                'or': "ଦିବାଙ୍ଗ",
                'as': "দিবাং"
            },
            "Lakhwar": {
                'en': "Lakhwar",
                'hi': "लखवार",
                'ta': "லக்வார்",
                'te': "లఖ్వార్",
                'ml': "ലഖ്വാർ",
                'kn': "ಲಖ್ವಾರ್",
                'mr': "लखवार",
                'bn': "লখওয়ার",
                'gu': "લાખવાર",
                'pa': "ਲਖਵਾਰ",
                'or': "ଲଖୱାର୍",
                'as': "লাখৱাৰ"
            },
            "CMRL TU02": {
                'en': "CMRL TU02",
                'hi': "सीएमआरएल TU02",
                'ta': "சி.எம்.ஆர்.எல் TU02",
                'te': "సీఎంఆర్ఎల్ TU02",
                'ml': "സി.എം.ആർ.എൽ TU02",
                'kn': "ಸಿಎಂಆರ್ಎಲ್ TU02",
                'mr': "सीएमआरएल TU02",
                'bn': "সিএমআরএল TU02",
                'gu': "સીએમઆરએલ TU02",
                'pa': "ਸੀਐਮਆਰਐਲ TU02",
                'or': "ସିଏମଆରଏଲ TU02",
                'as': "চিএমআৰএল TU02"
            },
            "CMRL P2 C4 ECV 01": {
                'en': "CMRL P2 C4 ECV 01",
                'hi': "सीएमआरएल P2 C4 ECV 01",
                'ta': "சி.எம்.ஆர்.எல் P2 C4 ECV 01",
                'te': "సీఎంఆర్ఎల్ P2 C4 ECV 01",
                'ml': "സി.എം.ആർ.എൽ P2 C4 ECV 01",
                'kn': "ಸಿಎಂಆರ್ಎಲ್ P2 C4 ECV 01",
                'mr': "सीएमआरएल P2 C4 ECV 01",
                'bn': "সিএমআরএল P2 C4 ECV 01",
                'gu': "સીએમઆરએલ P2 C4 ECV 01",
                'pa': "ਸੀਐਮਆਰਐਲ P2 C4 ECV 01",
                'or': "ସିଏମଆରଏଲ P2 C4 ECV 01",
                'as': "চিএমআৰএল P2 C4 ECV 01"
            },
            "CMRL PH II- C5 - ECV02": {
                'en': "CMRL PH II- C5 - ECV02",
                'hi': "सीएमआरएल PH II- C5 - ECV02",
                'ta': "சி.எம்.ஆர்.எல் PH II- C5 - ECV02",
                'te': "సీఎంఆర్ఎల్ PH II- C5 - ECV02",
                'ml': "സി.എം.ആർ.എൽ PH II- C5 - ECV02",
                'kn': "ಸಿಎಂಆರ್ಎಲ್ PH II- C5 - ECV02",
                'mr': "सीएमआरएल PH II- C5 - ECV02",
                'bn': "সিএমআরএল PH II- C5 - ECV02",
                'gu': "સીએમઆરએલ PH II- C5 - ECV02",
                'pa': "ਸੀਐਮਆਰਐਲ PH II- C5 - ECV02",
                'or': "ସିଏମଆରଏଲ PH II- C5 - ECV02",
                'as': "চিএমআৰএল PH II- C5 - ECV02"
            },
            "CMRL PH II CP 10 EV03": {
                'en': "CMRL PH II CP 10 EV03",
                'hi': "सीएमआरएल PH II CP 10 EV03",
                'ta': "சி.எம்.ஆர்.எல் PH II CP 10 EV03",
                'te': "సీఎంఆర్ఎల్ PH II CP 10 EV03",
                'ml': "സി.എം.ആർ.എൽ PH II CP 10 EV03",
                'kn': "ಸಿಎಂಆರ್ಎಲ್ PH II CP 10 EV03",
                'mr': "सीएमआरएल PH II CP 10 EV03",
                'bn': "সিএমআরএল PH II CP 10 EV03",
                'gu': "સીએમઆરએલ PH II CP 10 EV03",
                'pa': "ਸੀਐਮਆਰਐਲ PH II CP 10 EV03",
                'or': "ସିଏମଆରଏଲ PH II CP 10 EV03",
                'as': "চিএমআৰএল PH II CP 10 EV03"
            },
            "CMRL PH II CP 08 EV01": {
                'en': "CMRL PH II CP 08 EV01",
                'hi': "सीएमआरएल PH II CP 08 EV01",
                'ta': "சி.எம்.ஆர்.எல் PH II CP 08 EV01",
                'te': "సీఎంఆర్ఎల్ PH II CP 08 EV01",
                'ml': "സി.എം.ആർ.എൽ PH II CP 08 EV01",
                'kn': "ಸಿಎಂಆರ್ಎಲ್ PH II CP 08 EV01",
                'mr': "सीएमआरएल PH II CP 08 EV01",
                'bn': "সিএমআরএল PH II CP 08 EV01",
                'gu': "સીએમઆરએલ PH II CP 08 EV01",
                'pa': "ਸੀਐਮਆਰਐਲ PH II CP 08 EV01",
                'or': "ସିଏମଆରଏଲ PH II CP 08 EV01",
                'as': "চিএমআৰএল PH II CP 08 EV01"
            },
            "MUMBAI METRO UGC01": {
                'en': "MUMBAI METRO UGC01",
                'hi': "मुंबई मेट्रो UGC01",
                'ta': "மும்பை மெட்ரோ UGC01",
                'te': "ముంబై మెట్రో UGC01",
                'ml': "മുംബൈ മെട്രോ UGC01",
                'kn': "ಮುಂಬೈ ಮೆಟ್ರೋ UGC01",
                'mr': "मुंबई मेट्रो UGC01",
                'bn': "মুম্বাই মেট্রো UGC01",
                'gu': "મુંબઈ મેટ્રો UGC01",
                'pa': "ਮੁੰਬਈ ਮੈਟਰੋ UGC01",
                'or': "ମୁମ୍ବାଇ ମେଟ୍ରୋ UGC01",
                'as': "মুম্বাই মেট্ৰ’ UGC01"
            },
            "Kolkatta Metro UG1": {
                'en': "Kolkatta Metro UG1",
                'hi': "कोलकाता मेट्रो UG1",
                'ta': "கொல்கத்தா மெட்ரோ UG1",
                'te': "కోల్‌కతా మెట్రో UG1",
                'ml': "കൊൽക്കത്ത മെട്രോ UG1",
                'kn': "ಕೋಲ್ಕತ್ತಾ ಮೆಟ್ರೋ UG1",
                'mr': "कोलकाता मेट्रो UG1",
                'bn': "কলকাতা মেট্রো UG1",
                'gu': "કોલકાતા મેટ્રો UG1",
                'pa': "ਕੋਲਕਾਤਾ ਮੈਟਰੋ UG1",
                'or': "କୋଲକାତା ମେଟ୍ରୋ UG1",
                'as': "কলকাতা মেট্ৰ’ UG1"
            },
            "MAHSR C5": {
                'en': "MAHSR C5",
                'hi': "एमएएचएसआर C5",
                'ta': "எம்.ஏ.ஹெச்.எஸ்.ஆர் C5",
                'te': "ఎంఏహెచ్ఎస్ఆర్ C5",
                'ml': "എം.എ.എച്ച്.എസ്.ആർ C5",
                'kn': "ಎಂ.ಎ.ಎಚ್.ಎಸ್.ಆರ್ C5",
                'mr': "एमएएचएसआर C5",
                'bn': "এমএএইচএসআর C5",
                'gu': "એમ.એ.એચ.એસ.આર C5",
                'pa': "ਐਮ.ਏ.ਐਚ.ਐਸ.ਆਰ C5",
                'or': "ଏମଏଏଚଏସଆର C5",
                'as': "এমএএইচএছআৰ C5"
            },
            "MAHSR C3-Section 1": {
                'en': "MAHSR C3-Section 1",
                'hi': "एमएएचएसआर C3-खंड 1",
                'ta': "எம்.ஏ.ஹெச்.எஸ்.ஆர் C3-பிரிவு 1",
                'te': "MAHSR C3-విభాగం 1",
                'ml': "MAHSR C3-വിഭാഗം 1",
                'kn': "MAHSR C3-ವಿಭಾಗ 1",
                'mr': "MAHSR C3-विभाग 1",
                'bn': "MAHSR C3-বিভাগ 1",
                'gu': "MAHSR C3-વિભાગ 1",
                'pa': "MAHSR C3-ਸੈਕਸ਼ਨ 1",
                'or': "MAHSR C3-ବିଭାଗ 1",
                'as': "MAHSR C3-শাখা 1"
            },
            "MAHSR C3-Section 2": {
                'en': "MAHSR C3-Section 2",
                'hi': "एमएएचएसआर C3-खंड 2",
                'ta': "எம்.ஏ.ஹெச்.எஸ்.ஆர் C3-பிரிவு 2",
                'te': "MAHSR C3-విభాగం 2",
                'ml': "MAHSR C3-വിഭാഗം 2",
                'kn': "MAHSR C3-ವಿಭಾಗ 2",
                'mr': "MAHSR C3-विभाग 2",
                'bn': "MAHSR C3-বিভাগ 2",
                'gu': "MAHSR C3-વિભાગ 2",
                'pa': "MAHSR C3-ਸੈਕਸ਼ਨ 2",
                'or': "MAHSR C3-ବିଭାଗ 2",
                'as': "MAHSR C3-শাখা 2"
            },
            "MAHSR C3-Section 3": {
                'en': "MAHSR C3-Section 3",
                'hi': "एमएएचएसआर C3-खंड 3",
                'ta': "எம்.ஏ.ஹெச்.எஸ்.ஆர் C3-பிரிவு 3",
                'te': "MAHSR C3-విభాగం 3",
                'ml': "MAHSR C3-വിഭാഗം 3",
                'kn': "MAHSR C3-ವಿಭಾಗ 3",
                'mr': "MAHSR C3-विभाग 3",
                'bn': "MAHSR C3-বিভাগ 3",
                'gu': "MAHSR C3-વિભાગ 3",
                'pa': "MAHSR C3-ਸੈਕਸ਼ਨ 3",
                'or': "MAHSR C3-ବିଭାଗ 3",
                'as': "MAHSR C3-শাখা 3"
            },
            "MAHSR C3-Section 4": {
                'en': "MAHSR C3-Section 4",
                'hi': "एमएएचएसआर C3-खंड 4",
                'ta': "எம்.ஏ.ஹெச்.எஸ்.ஆர் C3-பிரிவு 4",
                'te': "MAHSR C3-విభాగం 4",
                'ml': "MAHSR C3-വിഭാഗം 4",
                'kn': "MAHSR C3-ವಿಭಾಗ 4",
                'mr': "MAHSR C3-विभाग 4",
                'bn': "MAHSR C3-বিভাগ 4",
                'gu': "MAHSR C3-વિભાગ 4",
                'pa': "MAHSR C3-ਸੈਕਸ਼ਨ 4",
                'or': "MAHSR C3-ବିଭାଗ 4",
                'as': "MAHSR C3-শাখা 4"
            },
            "Orange Gate": {
                'en': "Orange Gate",
                'hi': "ऑरेंज गेट",
                'ta': "ஆரஞ்சு கேட்",
                'te': "ఆరెంజ్ గేట్",
                'ml': "ഓറഞ്ച് ഗേറ്റ്",
                'kn': "ಆರೆಂಜ್ ಗೇಟ್",
                'mr': "ऑरेंज गेट",
                'bn': "অরেঞ্জ গেট",
                'gu': "ઓરેન્જ ગેટ",
                'pa': "ਔਰੇਂਜ ਗੇਟ",
                'or': "ଅରେଞ୍ଜ ଗେଟ୍",
                'as': "অৰেঞ্জ গেট"
            },
            "Patna metro PC03": {
                'en': "Patna metro PC03",
                'hi': "पटना मेट्रो PC03",
                'ta': "பாட்னா மெட்ரோ PC03",
                'te': "పాట్నా మెట్రో PC03",
                'ml': "പട്ന മെട്രോ PC03",
                'kn': "ಪಾಟ್ನಾ ಮೆಟ್ರೋ PC03",
                'mr': "पाटणा मेट्रो PC03",
                'bn': "পাটনা মেট্রো PC03",
                'gu': "પટના મેટ્રો PC03",
                'pa': "ਪਟਨਾ ਮੈਟਰੋ PC03",
                'or': "ପାଟନା ମେଟ୍ରୋ PC03",
                'as': "পাটনা মেট্ৰ’ PC03"
            },
            "Patna metro PC08R": {
                'en': "Patna metro PC08R",
                'hi': "पटना मेट्रो PC08R",
                'ta': "பாட்னா மெட்ரோ PC08R",
                'te': "పాట్నా మెట్రో PC08R",
                'ml': "പട്ന മെട്രോ PC08R",
                'kn': "ಪಾಟ್ನಾ ಮೆಟ್ರೋ PC08R",
                'mr': "पाटणा मेट्रो PC08R",
                'bn': "পাটনা মেট্রো PC08R",
                'gu': "પટના મેટ્રો PC08R",
                'pa': "ਪਟਨਾ ਮੈਟਰੋ PC08R",
                'or': "ପାଟନା ମେଟ୍ରୋ PC08R",
                'as': "পাটনা মেট্ৰ’ PC08R"
            },
            "Agra Metro": {
                'en': "Agra Metro",
                'hi': "आगरा मेट्रो",
                'ta': "ஆக்ரா மெட்ரோ",
                'te': "ఆగ్రా మెట్రో",
                'ml': "ആഗ്ര മെട്രോ",
                'kn': "ಆಗ್ರಾ ಮೆಟ್ರೋ",
                'mr': "आग्रा मेट्रो",
                'bn': "আগ্রা মেট্রো",
                'gu': "આગ્રા મેટ્રો",
                'pa': "ਆਗਰਾ ਮੈਟਰੋ",
                'or': "ଆଗ୍ରା ମେଟ୍ରୋ",
                'as': "আগ্ৰা মেট্ৰ’"
            },
            "DMRC DC09": {
                'en': "DMRC DC09",
                'hi': "डीएमआरसी DC09",
                'ta': "டி.எம்.ஆர்.சி DC09",
                'te': "డీఎంఆర్సీ DC09",
                'ml': "ഡി.എം.ആർ.സി DC09",
                'kn': "ಡಿ.ಎಂ.ಆರ್.ಸಿ DC09",
                'mr': "डीएमआरसी DC09",
                'bn': "ডিএমআরসি DC09",
                'gu': "ડી.એમ.આર.સી DC09",
                'pa': "ਡੀ.ਐਮ.ਆਰ.ਸੀ DC09",
                'or': "ଡିଏମଆରସି DC09",
                'as': "ডিএমআৰচি DC09"
            },
            "High Speed Rail C4-Section 1": {
                'en': "High Speed Rail C4-Section 1",
                'hi': "हाई स्पीड रेल C4-खंड 1",
                'ta': "அதிвеக ரயில் C4-பிரிவு 1",
                'te': "హై స్పీడ్ రైలు C4-విభాగం 1",
                'ml': "ഹൈ സ്പീഡ് റെയിൽ C4-വിഭാഗം 1",
                'kn': "ಹೈ სპೀಡ್ ರೈಲು C4-ವಿಭಾಗ 1",
                'mr': "हाय स्पीड रेल C4-विभाग 1",
                'bn': "হাই স্পিড রেল C4-বিভাগ 1",
                'gu': "હાઈ સ્પીડ રેલ C4-વિભાગ 1",
                'pa': "ਹਾਈ ਸਪੀਡ ਰੇਲ C4-ਸੈਕਸ਼ਨ 1",
                'or': "ହାଇ ସ୍ପିଡ୍ ରେଳ C4-ବିଭାଗ 1",
                'as': "হাই স্পীড ৰেল C4-শাখা 1"
            },
            "High Speed Rail C4-Section 2": {
                'en': "High Speed Rail C4-Section 2",
                'hi': "हाई स्पीड रेल C4-खंड 2",
                'ta': "அதிвеக ரயில் C4-பிரிவு 2",
                'te': "హై స్పీడ్ రైలు C4-విభాగం 2",
                'ml': "ഹൈ സ്പീഡ് റെയിൽ C4-വിഭാഗം 2",
                'kn': "ಹೈ სპೀಡ್ ರೈಲು C4-ವಿಭಾಗ 2",
                'mr': "हाय स्पीड रेल C4-विभाग 2",
                'bn': "হাই স্পিড রেল C4-বিভাগ 2",
                'gu': "હાઈ સ્પીડ રેલ C4-વિભાગ 2",
                'pa': "ਹਾਈ ਸਪੀਡ ਰੇਲ C4-ਸੈਕਸ਼ਨ 2",
                'or': "ହାଇ ସ୍ପିଡ୍ ରେଳ C4-ବିଭାଗ 2",
                'as': "হাই স্পীড ৰেল C4-শাখা 2"
            },
            "High Speed Rail C4-Section 3": {
                'en': "High Speed Rail C4-Section 3",
                'hi': "हाई स्पीड रेल C4-खंड 3",
                'ta': "அதிвеக ரயில் C4-பிரிவு 3",
                'te': "హై స్పీడ్ రైలు C4-విభాగం 3",
                'ml': "ഹൈ സ്പീഡ് റെയിൽ C4-വിഭാഗം 3",
                'kn': "ಹೈ სპೀಡ್ ರೈಲು C4-ವಿಭಾಗ 3",
                'mr': "हाय स्पीड रेल C4-विभाग 3",
                'bn': "হাই স্পিড রেল C4-বিভাগ 3",
                'gu': "હાઈ સ્પીડ રેલ C4-વિભાગ 3",
                'pa': "ਹਾਈ ਸਪੀਡ ਰੇਲ C4-ਸੈਕਸ਼ਨ 3",
                'or': "ହାଇ ସ୍ପિଡ୍ ରେଳ C4-ବିଭାଗ 3",
                'as': "হাই স্পীড ৰেল C4-শাখা 3"
            },
            "High Speed Rail C4-Section 4": {
                'en': "High Speed Rail C4-Section 4",
                'hi': "हाई स्पीड रेल C4-खंड 4",
                'ta': "அதிвеக ரயில் C4-பிரிவு 4",
                'te': "హై స్పీడ్ రైలు C4-విభాగం 4",
                'ml': "ഹൈ സ്പീഡ് റെയിൽ C4-വിഭാഗം 4",
                'kn': "హೈ სპೀಡ್ ರೈಲು C4-ವಿಭಾಗ 4",
                'mr': "हाय स्पीड रेल C4-विभाग 4",
                'bn': "হাই স্পিড রেল C4-বিভাগ 4",
                'gu': "હાઈ સ્પીડ રેલ C4-વિભાગ 4",
                'pa': "ਹਾਈ ਸਪੀਡ ਰੇਲ C4-ਸੈਕਸ਼ਨ 4",
                'or': "ହାଇ ସ୍ପિଡ୍ ରେଳ C4-ବିଭାଗ 4",
                'as': "হাই স্পীড ৰেল C4-শাখা 4"
            },
            "High Speed Rail C4-Section 5": {
                'en': "High Speed Rail C4-Section 5",
                'hi': "हाई स्पीड रेल C4-खंड 5",
                'ta': "அதிவேக ரயில் C4-பிரிவு 5",
                'te': "హై స్పీడ్ రైలు C4-విభాగం 5",
                'ml': "ഹൈ സ്പീഡ് റെയിൽ C4-വിഭാഗം 5",
                'kn': "ಹೈ სპೀಡ್ ರೈಲು C4-ವಿಭಾಗ 5",
                'mr': "हाय स्पीड रेल C4-विभाग 5",
                'bn': "হাই স্পিড রেল C4-বিভাগ 5",
                'gu': "હાઈ સ્પીડ રેલ C4-વિભાગ 5",
                'pa': "ਹਾਈ ਸਪੀਡ ਰੇਲ C4-ਸੈਕਸ਼ਨ 5",
                'or': "ହାଇ ସ୍ପિଡ୍ ରେଳ C4-ବିଭାਗ 5",
                'as': "হাই স্পীড ৰেল C4-শাখা 5"
            },
            "MCRP-01 Haji Ali Car Park": {
                'en': "MCRP-01 Haji Ali Car Park",
                'hi': "MCRP-01 हाजी अली कार पार्क",
                'ta': "MCRP-01 ஹாஜி அலி கார் பார்க்கிங்",
                'te': "MCRP-01 హాజీ అలీ కార్ పార్క్",
                'ml': "MCRP-01 ഹാജി അലി കാർ പാർക്ക്",
                'kn': "MCRP-01 ಹಾಜಿ ಅಲಿ ಕಾರ್ ಪಾರ್ಕ್",
                'mr': "MCRP-01 हाजी अली कार पार्क",
                'bn': "MCRP-01 হাজী আলী কার পার্ক",
                'gu': "MCRP-01 હાજી અલી કાર પાર્ક",
                'pa': "MCRP-01 ਹਾਜੀ ਅਲੀ ਕਾਰ ਪਾਰਕ",
                'or': "MCRP-01 ହାଜି ଅଲି କାର୍ ପାର୍କ",
                'as': "MCRP-01 হাজী আলী কাৰ পার্ক"
            },
            "BARAPULLAH BRIDGE PROJECT": {
                'en': "BARAPULLAH BRIDGE PROJECT",
                'hi': "बारापुला ब्रिज परियोजना",
                'ta': "பாராபுல்லா பாலம் திட்டம்",
                'te': "బారపుల్లా వంతెన ప్రాజెక్ట్",
                'ml': "ബാരപ്പുള്ള പാലം പ്രോജക്റ്റ്",
                'kn': "ಬಾರಾಪುಲ್ಲა ಸೇತುವೆ ಯೋಜನೆ",
                'mr': "बारापुला पूल प्रकल्प",
                'bn': "বারাপুল্লা সেতু প্রকল্প",
                'gu': "બારાપુલ્લા પુલ પ્રોજેક્ટ",
                'pa': "ਬਾਰਾਪੁੱਲਾ ਪੁਲ ਪ੍ਰոਜੈਕਟ",
                'or': "ବାରାପୁଲ୍ଲା ସେତୁ ପ୍ରକଳ୍ප",
                'as': "বাৰাপুল্লা দলং প্ৰকল্প"
            },
            "TWCC Factory": {
                'en': "TWCC Factory",
                'hi': "TWCC फैक्ट्री",
                'ta': "TWCC தொழிற்சாலை",
                'te': "TWCC ఫ్యాక్టరీ",
                'ml': "TWCC ഫാക്ടറി",
                'kn': "TWCC ಫ್ಯಾಕ್ಟರಿ",
                'mr': "TWCC कारखाना",
                'bn': "TWCC কারখানা",
                'gu': "TWCC ફેક્ટરી",
                'pa': "TWCC ਫੈਕਟਰੀ",
                'or': "TWCC କାରଖାନା",
                'as': "TWCC ফেক্টৰী"
            },
            "KKNPP 5&6 erection package": {
                'en': "KKNPP 5&6 erection package",
                'hi': "केकेएनपीपी 5&6 इरेक्शन पैकेज",
                'ta': "கே.கே.என்.பி.பி 5&6 நிறுவல் தொகுப்பு",
                'te': "KKNPP 5&6 ఎరెక్షన్ ప్యాకేజీ",
                'ml': "KKNPP 5&6 ഇറക്ഷൻ പാക്കേജ്",
                'kn': "KKNPP 5&6 ಇರೆಕ್ಷನ್ ಪ್ಯಾಕೇಜ್",
                'mr': "KKNPP 5&6 इरेक्शन पॅकेज",
                'bn': "KKNPP 5&6 ইরেকশন প্যাকেজ",
                'gu': "KKNPP 5&6 ઇરેક્શન પેકેજ",
                'pa': "KKNPP 5&6 ਇਰੈਕਸ਼ਨ ਪੈਕੇਜ",
                'or': "KKNPP 5&6 ଇରେକ୍ସନ ପ୍ୟାକେଜ୍",
                'as': "KKNPP 5&6 ইৰেকচন পেকেজ"
            },
            "PHEP Bhutan": {
                'en': "PHEP Bhutan",
                'hi': "PHEP भूटान",
                'ta': "PHEP பூட்டான்",
                'te': "PHEP భూటాన్",
                'ml': "PHEP ഭൂട്ടാൻ",
                'kn': "PHEP ಭೂತಾನ್",
                'mr': "PHEP भूटान",
                'bn': "PHEP ভুটান",
                'gu': "PHEP ભૂટાન",
                'pa': "PHEP ਭੂਟਾਨ",
                'or': "PHEP ଭୁଟାନ",
                'as': "PHEP ভূটান"
            },
            "LIGO": {
                'en': "LIGO",
                'hi': "लीगो",
                'ta': "லிகோ",
                'te': "లిగో",
                'ml': "ലൈഗോ",
                'kn': "ಲಿಗೋ",
                'mr': "लीगो",
                'bn': "লিগো",
                'gu': "લિગો",
                'pa': "ਲੀਗੋ",
                'or': "ଲିଗୋ",
                'as': "লিগো"
            },
            "Saidongar Pumped Storage Project": {
                'en': "Saidongar Pumped Storage Project",
                'hi': "सैदोंगर पंप्ड स्टोरेज परियोजना",
                'ta': "சைடோங்கர் பம்ப் செய்யப்பட்ட சேமிப்பு திட்டம்",
                'te': "సైదోంగర్ పంప్డ్ స్టోరేజ్ ప్రాజెక్ట్",
                'ml': "സൈദോംഗർ പമ്പ്ഡ് സ്റ്റോറേജ് പ്രോജക്റ്റ്",
                'kn': "ಸೈದೋಂಗರ್ ಪಂಪ್ಡ್ ಸ್ಟೋರೇಜ್ ಯೋಜನೆ",
                'mr': "सैदोंगर पंप्ड स्टोरेज प्रकल्प",
                'bn': "সাইডোঙ্গার পাম্পড স্টোরেজ প্রকল্প",
                'gu': "સૈદોંગર પમ્પ્ડ સ્ટોરેજ પ્રોજેક્ટ",
                'pa': "ਸੈਦੋਂਗਰ ਪੰਪਡ ਸਟੋਰੇਜ ਪ੍ਰੋਜੈਕਟ",
                'or': "ସାଇଡୋଙ୍ଗର ପମ୍ପଡ୍ ଷ୍ଟୋରେଜ୍ ପ୍ରକଳ୍ପ",
                'as': "চাইডোংগাৰ পাম্পড ষ্ট’ৰেজ প্ৰকল্প"
            },
            "Ethihad Rail - Sharjah University": {
                'en': "Ethihad Rail - Sharjah University",
                'hi': "एतिहाद रेल - शारजाह विश्वविद्यालय",
                'ta': "எதிஹாட் ரயில் - ஷார்ஜா பல்கலைக்கழகம்",
                'te': "ఎతిహాద్ రైలు - షార్జా విశ్వవిద్యాలయం",
                'ml': "എത്തിഹാദ് റെയിൽ - ഷാർജ സർവ്വകലാശാല",
                'kn': "ಎತಿಹಾದ್ ರೈಲು - ಶಾರ್ಜಾ ವಿಶ್ವವಿದ್ಯಾಲಯ",
                'mr': "एतिहाद रेल - शारजाह विद्यापीठ",
                'bn': "ইতিহাদ রেল - শারজাহ বিশ্ববিদ্যালয়",
                'gu': "એતિহાદ રેલ - શારજાহ યુનિવર્સિટી",
                'pa': "ਇਤਿਹਾਦ ਰੇਲ - ਸ਼ਾਰਜਾਹ ਯੂਨੀਵਰសਿਟੀ",
                'or': "ଏତିହାଦ୍ ରେଳ - ଶାରଜାହ ବିଶ୍ୱବିଦ୍ୟାଳୟ",
                'as': "ইতিহাদ ৰে'ল - শ্বাৰজাহ বিশ্ববিদ্যালয়"
            },
            "Cochin Dry Dock": {
                'en': "Cochin Dry Dock",
                'hi': "कोचीन ड्राई डॉक",
                'ta': "கொச்சி உலர் கப்பல்துறை",
                'te': "కొచ్చిన్ డ్రై డాక్",
                'ml': "കൊച്ചിൻ ഡ്രൈ ഡോക്ക്",
                'kn': "ಕೊಚ್ಚಿನ್ ಡ್ರೈ ಡಾಕ್",
                'mr': "कोचीन ड्राय डॉक",
                'bn': "কোচিন ড্রাই ডক",
                'gu': "કોચિન ડ્રાય ડોક",
                'pa': "ਕੋਚੀਨ ਡ੍ਰਾਈ ਡੌਕ",
                'or': "କୋଚିନ୍ ଡ୍ରାଏ ଡକ୍",
                'as': "কোচিন ড্ৰাই ডক"
            },
            "Orange Gate Urban Road Tunnel Project": {
                'en': "Orange Gate Urban Road Tunnel Project",
                'hi': "ऑरेंज गेट शहरी सड़क सुरंग परियोजना",
                'ta': "ஆரஞ்சு கேட் நகர்ப்புற சாலை சுரங்கப்பாதை திட்டம்",
                'te': "ఆరెంజ్ గేట్ పట్టణ రహదారి సొరంగం ప్రాజెక్ట్",
                'ml': "ഓറഞ്ച് ഗേറ്റ് നഗര റോഡ് തുരങ്ക പ്രോജക്റ്റ്",
                'kn': "ಆರೆಂಜ್ ಗೇಟ್ ನಗರ ರಸ್ತೆ ಸುರಂಗ ಯೋಜನೆ",
                'mr': "ऑरेंज गेट नागरी रस्ता बोगदा प्रकल्प",
                'bn': "অরেঞ্জ গেট নগর সড়ক সুড়ঙ্গ প্রকল্প",
                'gu': "ઓરેન્જ ગેટ શહેરી માર્ગ ટનલ પ્રોજેક્ટ",
                'pa': "ਔਰੇਂજ ਗੇਟ ਸ਼ਹਿਰੀ ਸੜਕ ਸੁਰੰਗ ਪ੍ਰੋਜੈਕਟ",
                'or': "ଅରେଞ୍ଜ ଗେଟ୍ ସହରୀ ସଡ଼କ ସୁଡ଼ଙ୍ଗ ପ୍ରକଳ୍ପ",
                'as': "অৰেঞ্জ গেট চহৰীয়া পথ সুৰংগ প্ৰকল্প"
            },
            "1500 MW Bhavali PSP": {
                'en': "1500 MW Bhavali PSP",
                'hi': "1500 मेगावाट भावली PSP",
                'ta': "1500 மெகாவாட் பவாலி PSP",
                'te': "1500 MW భావలి PSP",
                'ml': "1500 MW ഭാവലി PSP",
                'kn': "1500 MW ಭಾವಲಿ PSP",
                'mr': "1500 MW भावली PSP",
                'bn': "1500 MW ভাবালি PSP",
                'gu': "1500 MW ભાવલી PSP",
                'pa': "1500 MW ਭਾਵਾਲੀ PSP",
                'or': "1500 MW ଭାବଲି PSP",
                'as': "1500 MW ভাৱালী PSP"
            },
        }

        locations_list = [
            "Camp A",
            "Camp B",
            "Camp C",
            "Accommodation Block 1",
            "Accommodation Block 2",
            "Toilet Block A",
            "Toilet Block B",
            "Kitchen Area",
            "Dining Area",
            "Water Tank Area"
        ]

        lang_prefixes = {
            'en': '',
            'hi': 'परियोजना',
            'ta': 'திட்டம்',
            'te': 'ప్రాజెక్ట్',
            'mr': 'प्रकल्प',
            'or': 'ପ୍ରୋଜେକ୍ଟ',
            'bn': 'প্রকল্প',
            'pa': 'ਪ੍ਰੋਜੈਕਟ',
            'gu': 'પ્રોજેક્ટ',
            'as': 'প্ৰকল্প',
            'kn': 'ಯोजना',
            'ml': 'പദ്ധതി'
        }

        loc_translations = {
            "Camp A": {
                'en': 'Camp A', 'hi': 'शिविर ए', 'ta': 'முகாம் ஏ', 'te': 'క్యాంప్ ఎ', 'mr': 'कॅम्प ए',
                'or': 'କ୍ୟାମ୍ପ ଏ', 'bn': 'ক্যাম্প এ', 'pa': 'ਕੈਂਪ ਏ', 'gu': 'કેમ્પ એ', 'as': 'কেম্প এ',
                'kn': 'ಕ್ಯಾಂಪ್ ఎ', 'ml': 'ക്యాമ്പ് எ'
            },
            "Camp B": {
                'en': 'Camp B', 'hi': 'शिविर बी', 'ta': 'முகாம் பி', 'te': 'క్యాంప్ బి', 'mr': 'कॅम्प बी',
                'or': 'କ୍ୟାମ୍ପ ବି', 'bn': 'क্যাম্প பி', 'pa': 'ਕੈਂਪ ਬੀ', 'gu': 'કેમ્પ બી', 'as': 'কেম্প বি',
                'kn': 'ಕ್యಾಂಪ್ ಬಿ', 'ml': 'ക്యాമ്പ് ಬಿ'
            },
            "Camp C": {
                'en': 'Camp C', 'hi': 'शिविर सी', 'ta': 'முகாம் சி', 'te': 'క్యాंప్ సి', 'mr': 'कॅम्प सी',
                'or': 'କ୍ୟାମ୍ପ ସି', 'bn': 'क্যাম্প সি', 'pa': 'ਕੈਂਪ ਸੀ', 'gu': 'કેમ્પ સી', 'as': 'কেম্প সি',
                'kn': 'ಕ್యಾಂಪ್ ಸಿ', 'ml': 'ക്యాമ്പ് സി'
            },
            "Accommodation Block 1": {
                'en': 'Accommodation Block 1', 'hi': 'आवास ब्लॉक 1', 'ta': 'தங்குமிடம் தொகுதி 1', 'te': 'వసతి బ్లాక్ 1', 'mr': 'राहण्याची खोली ब्लॉक १',
                'or': 'ରହିବା ବ୍ଲକ ୧', 'bn': 'আবাসন ब्लॉक ১', 'pa': 'ਰਿਹਾਇਸ਼ ਬਲਾక్ 1', 'gu': 'રહેઠાણ બ્લોક ૧', 'as': 'আৱাস ব্লক ১',
                'kn': 'ವಸతి ಬ్లాక్ 1', 'ml': 'താமசம் ബ്ലോക്ക് 1'
            },
            "Accommodation Block 2": {
                'en': 'Accommodation Block 2', 'hi': 'आवास ब्लॉक 2', 'ta': 'தங்குமிடம் தொகுதி 2', 'te': 'వసతి బ్లాక్ 2', 'mr': 'राहण्याची खोली ब्लॉक २',
                'or': 'ରହିବା ବ୍ଲକ ୨', 'bn': 'আবাসন ब्लॉक ২', 'pa': 'ਰਿਹਾਇਸ਼ బలాక్ 2', 'gu': 'રહેઠાણ બ્લોક ૨', 'as': 'আৱাস ব্লক ২',
                'kn': 'ವಸతి బ్లాక్ 2', 'ml': 'താമசம் ബ്ലോക്ക് 2'
            },
            "Toilet Block A": {
                'en': 'Toilet Block A', 'hi': 'शौचालय ब्लॉक ए', 'ta': 'கழிப்பறை தொகுதி ஏ', 'te': 'టాయిలెట్ బ్లాక్ ఎ', 'mr': 'शौचालय ब्लॉक ए',
                'or': 'ଶୌଚାଳୟ ବ୍ଲକ ଏ', 'bn': 'শৌচাগার ব্লক এ', 'pa': 'ਟਾਇਲਟ ਬਲਾਕ ਏ', 'gu': 'ટોયલેટ બ્લોક એ', 'as': 'শৌচালয় ব্লক এ',
                'kn': 'ಶೌಚಾಲಯ ಬ్లాಕ್ ಎ', 'ml': 'ശുചിமுറി ബ്ലோക്ക് എ'
            },
            "Toilet Block B": {
                'en': 'Toilet Block B', 'hi': 'शौचालय ब्लॉक बी', 'ta': 'கழிப்பறை தொகுதி பி', 'te': 'టాయిలెట్ బ్లాక్ బి', 'mr': 'शौचालय ब्लॉक बी',
                'or': 'ଶୌଚାଳୟ ବ୍ଲକ ବି', 'bn': 'শৌচাগার ব্লক பி', 'pa': 'ਟਾਇਲਟ ਬਲਾక్ ਬੀ', 'gu': 'ટોયલેટ બ્લોક બી', 'as': 'শৌচালয় ব্লক বি',
                'kn': 'ಶೌಚಾಲಯ ಬ్లాక్ ಬಿ', 'ml': 'ശുചിமுറി ബ്ലോക്ക് ബി'
            },
            "Kitchen Area": {
                'en': 'Kitchen Area', 'hi': 'रसोई क्षेत्र', 'ta': 'சமையலறை பகுதி', 'te': 'వంటగది ప్రాంతం', 'mr': 'स्वयंपाकघर परिसर',
                'or': 'ରୋଷେଇ ଘର ଅଞ୍ಚଳ', 'bn': 'রান্নাघर এলাকা', 'pa': 'ਰਸोਈ ਖੇਤਰ', 'gu': 'રસોડાનો વિસ્તાર', 'as': 'ৰান্ধনীঘৰ এলেকা',
                'kn': 'ಅಡುಗೆ ಮನೆ ಪ್ರದೇಶ', 'ml': 'അടുക്കള ప్రదేశం'
            },
            "Dining Area": {
                'en': 'Dining Area', 'hi': 'भोजन क्षेत्र', 'ta': 'உணவருந்தும் பகுதி', 'te': 'భోజన ప్రాంతం', 'mr': 'जेवणाचा परिसर',
                'or': 'ଭୋଜନ ଅଞ୍ચଳ', 'bn': 'খাবার এলাকা', 'pa': 'ਖਾਣ ਦਾ ਖੇਤਰ', 'gu': 'ભોજન વિસ્તાર', 'as': 'ভোজন এলেকা',
                'kn': 'ಊಟದ ಪ್ರದೇಶ', 'ml': 'ഭക്ഷണ മുറി പ്രதேசம்'
            },
            "Water Tank Area": {
                'en': 'Water Tank Area', 'hi': 'पानी की टंकी का क्षेत्र', 'ta': 'தண்ணீர் தொட்டி பகுதி', 'te': 'నీటి ట్యాంక్ ప్రాంతం', 'mr': 'पाण्याच्या टाकीचा परिसर',
                'or': 'ପାଣି ଟାଙ୍କି ଅଞ୍చଳ', 'bn': 'পানির ট্যাঙ্ক এলাকা', 'pa': 'ਪਾਣੀ ਦੀ ਟੈਂਕੀ ਦਾ ਖੇਤਰ', 'gu': 'પાણીની ટાંકીનો વિસ્તાર', 'as': 'পানীৰ টেংকী এলেকা',
                'kn': 'ನೀರಿನ ಟ్యాಂಕ್ ಪ್ರದೇಶ', 'ml': 'ജലസംഭരணி பிரதேசம்'
            }
        }

        # Collect current DB state
        db_projects = list(Project.objects.all())
        db_locations = list(Location.objects.all())

        # Protected project names
        PROTECTED_PROJECTS = {
            'KUDANKULAM PROJECT RB 3&4',
            'Test Speech Project',
            'Phase 5.6 Test Project'
        }

        audit_entries = []

        # Audit existing database projects and locations
        for p in db_projects:
            p_locs = [loc for loc in db_locations if loc.project_id == p.id]
            if not p_locs:
                comp_count = Complaint.objects.filter(project=p).count()
                current_status = "Active" if p.is_active else "Inactive"
                if p.name in projects_translations:
                    new_status = "Active"
                elif p.name in PROTECTED_PROJECTS or "Test" in p.name:
                    new_status = "Active (Protected, Skipped)"
                else:
                    new_status = "Inactive"
                audit_entries.append({
                    'project': p.name,
                    'location': "None",
                    'complaints': comp_count,
                    'current': current_status,
                    'new': new_status
                })
            else:
                for loc in p_locs:
                    comp_count = Complaint.objects.filter(project=p, location=loc).count()
                    current_status = "Active" if (p.is_active and loc.is_active) else "Inactive"
                    
                    if p.name in projects_translations:
                        p_new_active = True
                    elif p.name in PROTECTED_PROJECTS or "Test" in p.name:
                        p_new_active = True
                    else:
                        p_new_active = False

                    if p_new_active:
                        if p.name in projects_translations and loc.name in locations_list:
                            loc_new_status = "Active"
                        elif p.name in PROTECTED_PROJECTS or "Test" in p.name:
                            loc_new_status = "Active (Protected, Skipped)"
                        else:
                            loc_new_status = "Inactive"
                    else:
                        loc_new_status = "Inactive"

                    audit_entries.append({
                        'project': p.name,
                        'location': loc.name,
                        'complaints': comp_count,
                        'current': current_status,
                        'new': loc_new_status
                    })

        # Audit new projects/locations to be created
        for proj_name in projects_translations.keys():
            p_exists = any(p.name == proj_name for p in db_projects)
            if not p_exists:
                for loc_name in locations_list:
                    audit_entries.append({
                        'project': proj_name,
                        'location': loc_name,
                        'complaints': 0,
                        'current': "New",
                        'new': "Active"
                    })
            else:
                p_obj = next(p for p in db_projects if p.name == proj_name)
                for loc_name in locations_list:
                    l_exists = any(l.name == loc_name and l.project_id == p_obj.id for l in db_locations)
                    if not l_exists:
                        audit_entries.append({
                            'project': proj_name,
                            'location': loc_name,
                            'complaints': 0,
                            'current': "New",
                            'new': "Active"
                        })

        # Format and write report to console and file
        report_str = "\n"
        report_str += "---------------------------------------------------------------------------------------------------\n"
        report_str += f"{'Project Name':<40} | {'Location Name':<25} | {'Complaints':<10} | {'Current':<10} | {'New Status':<15}\n"
        report_str += "---------------------------------------------------------------------------------------------------\n"
        for entry in audit_entries:
            report_str += f"{entry['project']:<40} | {entry['location']:<25} | {entry['complaints']:<10} | {entry['current']:<10} | {entry['new']:<15}\n"
        report_str += "---------------------------------------------------------------------------------------------------\n"

        self.stdout.write(report_str)
        with open(log_filepath, 'a', encoding='utf-8') as f:
            f.write(report_str)

        # Apply database updates safely
        self.stdout.write(self.style.NOTICE(f"Applying project master data updates..."))
        with open(log_filepath, 'a', encoding='utf-8') as f:
            f.write("Applying project master data updates...\n")

        projects_created = 0
        locations_created = 0

        # Seed the 51 projects
        for proj_name, translations in projects_translations.items():
            localized_proj = {}
            for l_code, prefix in lang_prefixes.items():
                if l_code in translations:
                    localized_proj[l_code] = translations[l_code]
                else:
                    localized_proj[l_code] = f"{proj_name} ({prefix})" if prefix else proj_name

            project, p_created = Project.objects.get_or_create(name=proj_name)
            project.localized_names = localized_proj
            project.is_active = True
            # Assign business unit based on project name mapping
            BU_MAP = {
                "1200 MW Teesta III HEP": "HYDEL & TUNNELS",
                "1500 MW Bhavali PSP": "HYDEL & TUNNELS",
                "300 MW Lakhwar Multi-Purpose Project": "HYDEL & TUNNELS",
                "Lakhwar": "HYDEL & TUNNELS",
                "3000 MW Saidongar-1 PSP, Karjat": "HYDEL & TUNNELS",
                "Saidongar Pumped Storage Project": "HYDEL & TUNNELS",
                "Agra Metro": "Urban Transit SBG-Elevated",
                "CMRL TU02": "UT SBG - Underground",
                "CMRL P2 C4 ECV 01": "Urban Transit SBG-Elevated",
                "CMRL PH II- C5 - ECV02": "Urban Transit SBG-Elevated",
                "CMRL PH II CP 08 EV01": "Urban Transit SBG-Elevated",
                "CMRL PH II CP 10 EV03": "Urban Transit SBG-Elevated",
                "CMRL C5 ECV02": "Urban Transit SBG-Elevated",
                "CMRL ECV01": "Urban Transit SBG-Elevated",
                "CMRL P2 C3 EV 01": "Urban Transit SBG-Elevated",
                "CMRL P2-C5 EV 03": "Urban Transit SBG-Elevated",
                "Dibang": "HYDEL & TUNNELS",
                "DMRC DC09": "UT SBG - Underground",
                "DMRC-DC09": "UT SBG - Underground",
                "Ethihad Rail - Sharjah University": "DEFENCE",
                "Ethihad Rail – Sharjah University Station Project": "DEFENCE",
                "BARAPULLAH BRIDGE PROJECT": "SPECIAL BRIDGES",
                "Extradosed Bridge over Barapullah": "SPECIAL BRIDGES",
                "Gandhi Sagar": "HYDEL & TUNNELS",
                "Gandhi Sagar PS Project": "HYDEL & TUNNELS",
                "GHAVP": "NUCLEAR & DEFENSE",
                "Control Building at BARC Tarapur": "NUCLEAR & DEFENSE",
                "INRPC, NRB, BARC, Tarapur": "NUCLEAR & DEFENSE",
                "KKNPP 5&6 erection package": "NUCLEAR & DEFENSE",
                "KKNPP 5 & 6 SFSF": "NUCLEAR & DEFENSE",
                "Kolkatta Metro UG1": "UT SBG - Underground",
                "KUDANKULAM PROJECT HTS & SFSF": "PORTS & HARBOURS",
                "KUDANKULAM PROJECT HTS": "PORTS & HARBOURS",
                "KUDANKULAM PROJECT RB 3&4": "NUCLEAR & DEFENSE",
                "KUDANKULAM PROJECT RB 5&6": "NUCLEAR & DEFENSE",
                "KUDANKULAM PROJECT 5&6 MEP": "NUCLEAR & DEFENSE",
                "Kopili HEP": "HYDEL & TUNNELS",
                "MAHSR C5": "Urban Transit SBG-Elevated",
                "MAHSR C3-Section 1": "MAHSR C3",
                "MAHSR C3-Section 2": "MAHSR C3",
                "MAHSR C3-Section 3": "MAHSR C3",
                "MAHSR C3-Section 4": "MAHSR C3",
                "High Speed Rail C4-Section 1": "MAHSR C4 TFL",
                "High Speed Rail C4-Section 2": "MAHSR C4 TFL",
                "High Speed Rail C4-Section 3": "MAHSR C4 TFL",
                "High Speed Rail C4-Section 4": "MAHSR C4 TFL",
                "High Speed Rail C4-Section 5": "MAHSR C4 TFL",
                "MCRP-01 Haji Ali Car Park": "Mumbai Jobs",
                "MUMBAI METRO UGC01": "UT SBG - Underground",
                "Orange Gate": "Orange Gate",
                "Orange Gate Urban Road Tunnel Project": "Orange Gate",
                "Pakaldul HEP": "HYDEL & TUNNELS",
                "Patna metro PC03": "UT SBG - Underground",
                "Patna metro PC08R": "UT SBG - Underground",
                "PHEP Bhutan": "HYDEL & TUNNELS",
                "RVNL 2": "HYDEL & TUNNELS",
                "RVNL-pkg 4": "HYDEL & TUNNELS",
                "SEA BIRD PROJECT-MWc04": "NUCLEAR & DEFENSE",
                "Seabird Package MWC04": "NUCLEAR & DEFENSE",
                "Teesta Sikkim": "HYDEL & TUNNELS",
                "TWCC Factory": "HEAVY CIVIL INFRA (COMMON)",
                "VIZAG VESSEL PROJECT": "NUCLEAR & DEFENSE",
                "Cochin Dry Dock": "NUCLEAR & DEFENSE",
                "LIGO": "NUCLEAR & DEFENSE",
            }
            if not project.business_unit:
                project.business_unit = BU_MAP.get(proj_name, "")
            project.save()
            if p_created:
                projects_created += 1

            for loc_name in locations_list:
                loc_trans = loc_translations.get(loc_name, {'en': loc_name})
                location, l_created = Location.objects.get_or_create(project=project, name=loc_name)
                location.localized_names = loc_trans
                location.is_active = True
                location.save()
                if l_created:
                    locations_created += 1

        # Deactivate old projects not in master list
        for p in Project.objects.all():
            if p.name not in projects_translations:
                if p.name in PROTECTED_PROJECTS or "Test" in p.name:
                    warn_msg = f"WARNING: Skipping deactivation for protected system config dependency project: '{p.name}'"
                    self.stdout.write(self.style.WARNING(warn_msg))
                    with open(log_filepath, 'a', encoding='utf-8') as f:
                        f.write(warn_msg + "\n")
                    p.is_active = True
                    p.save()
                else:
                    p.is_active = False
                    p.save()
                    Location.objects.filter(project=p).update(is_active=False)

        # Deactivate old locations of active projects
        for loc in Location.objects.all():
            if loc.project.name in projects_translations and loc.name not in locations_list:
                loc.is_active = False
                loc.save()

        # Clear Django cache
        cache.clear()
        self.stdout.write(self.style.SUCCESS("Django Cache cleared successfully."))
        with open(log_filepath, 'a', encoding='utf-8') as f:
            f.write("Django Cache cleared successfully.\n")

        self.stdout.write(
            self.style.SUCCESS(
                f"Successfully seeded database! Created/Updated {projects_created} projects and {locations_created} locations with translations."
            )
        )
