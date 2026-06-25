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
                'ta': "கூடங்குளம் திட்டம் RB 3&4"
            },
            "KUDANKULAM PROJECT RB 5&6": {
                'en': "KUDANKULAM PROJECT RB 5&6",
                'hi': "कुडनकुलम परियोजना RB 5&6",
                'ta': "கூடங்குளம் திட்டம் RB 5&6"
            },
            "KUDANKULAM PROJECT 5&6 MEP": {
                'en': "KUDANKULAM PROJECT 5&6 MEP",
                'hi': "कुडनकुलम परियोजना 5&6 MEP",
                'ta': "கூடங்குளம் திட்டம் 5&6 MEP"
            },
            "VIZAG VESSEL PROJECT": {
                'en': "VIZAG VESSEL PROJECT",
                'hi': "विजाग वेसल परियोजना",
                'ta': "வைசாக் வெசல் திட்டம்"
            },
            "Control Building at BARC Tarapur": {
                'en': "Control Building at BARC Tarapur",
                'hi': "बीएआरसी तारापुर में नियंत्रण भवन",
                'ta': "பார்சி தாராபூரில் கட்டுப்பாட்டு கட்டிடம்"
            },
            "SEA BIRD PROJECT-MWc04": {
                'en': "SEA BIRD PROJECT-MWc04",
                'hi': "सी बर्ड परियोजना-MWc04",
                'ta': "சீ பேர்ட் திட்டம்-MWc04"
            },
            "KUDANKULAM PROJECT HTS & SFSF": {
                'en': "KUDANKULAM PROJECT HTS & SFSF",
                'hi': "कुडनकुलम परियोजना HTS और SFSF",
                'ta': "கூடங்குளம் திட்டம் HTS & SFSF"
            },
            "GHAVP": {
                'en': "GHAVP",
                'hi': "जीएचएवीपी",
                'ta': "ஜி.ஹெச்.ஏ.வி.பி"
            },
            "MTHL extension": {
                'en': "MTHL extension",
                'hi': "एमटीएचएल विस्तार",
                'ta': "எம்டிஎச்எல் விரிவாக்கம்"
            },
            "Sitamma sagar": {
                'en': "Sitamma sagar",
                'hi': "सीताम्मा सागर",
                'ta': "சீதம்மா சாகர்"
            },
            "Teesta Sikkim": {
                'en': "Teesta Sikkim",
                'hi': "तीस्ता सिक्किम",
                'ta': "தீஸ்தா சிக்கிம்"
            },
            "Kopili HEP": {
                'en': "Kopili HEP",
                'hi': "कोपिली एचईपी",
                'ta': "கோபிலி ஹெச்.இ.பி"
            },
            "RVNL 2": {
                'en': "RVNL 2",
                'hi': "आरवीएनएल 2",
                'ta': "ஆர்.வி.என்.எல் 2"
            },
            "RVNL-pkg 4": {
                'en': "RVNL-pkg 4",
                'hi': "आरवीएनएल-पैकेज 4",
                'ta': "ஆர்.வி.என்.எல்-தொகுதி 4"
            },
            "Gandhi Sagar": {
                'en': "Gandhi Sagar",
                'hi': "गांधी सागर",
                'ta': "காந்தி சாகர்"
            },
            "Pakaldul HEP": {
                'en': "Pakaldul HEP",
                'hi': "पक्कलदुल एचईपी",
                'ta': "பகல் துல் ஹெச்.இ.பி"
            },
            "Dibang": {
                'en': "Dibang",
                'hi': "दिबांग",
                'ta': "திபாங்"
            },
            "Lakhwar": {
                'en': "Lakhwar",
                'hi': "लखवार",
                'ta': "லக்வார்"
            },
            "CMRL TU02": {
                'en': "CMRL TU02",
                'hi': "सीएमआरएल TU02",
                'ta': "சி.எம்.ஆர்.எல் TU02"
            },
            "CMRL P2 C4 ECV 01": {
                'en': "CMRL P2 C4 ECV 01",
                'hi': "सीएमआरएल P2 C4 ECV 01",
                'ta': "சி.எம்.ஆர்.எல் P2 C4 ECV 01"
            },
            "CMRL PH II- C5 - ECV02": {
                'en': "CMRL PH II- C5 - ECV02",
                'hi': "सीएमआरएल PH II- C5 - ECV02",
                'ta': "சி.எம்.ஆர்.எல் PH II- C5 - ECV02"
            },
            "CMRL PH II CP 10 EV03": {
                'en': "CMRL PH II CP 10 EV03",
                'hi': "सीएमआरएल PH II CP 10 EV03",
                'ta': "சி.எம்.ஆர்.எல் PH II CP 10 EV03"
            },
            "CMRL PH II CP 08 EV01": {
                'en': "CMRL PH II CP 08 EV01",
                'hi': "सीएमआरएल PH II CP 08 EV01",
                'ta': "சி.எம்.ஆர்.எல் PH II CP 08 EV01"
            },
            "MUMBAI METRO UGC01": {
                'en': "MUMBAI METRO UGC01",
                'hi': "मुंबई मेट्रो UGC01",
                'ta': "மும்பை மெட்ரோ UGC01"
            },
            "Kolkatta Metro UG1": {
                'en': "Kolkatta Metro UG1",
                'hi': "कोलकाता मेट्रो UG1",
                'ta': "கொல்கத்தா மெட்ரோ UG1"
            },
            "MAHSR C5": {
                'en': "MAHSR C5",
                'hi': "एमएएचएसआर C5",
                'ta': "எம்.ஏ.ஹெச்.எஸ்.आर C5"
            },
            "MAHSR C3-Section 1": {
                'en': "MAHSR C3-Section 1",
                'hi': "एमएएचएसआर C3-खंड 1",
                'ta': "எம்.ஏ.ஹெச்.எஸ்.ஆர் C3-பிரிவு 1"
            },
            "MAHSR C3-Section 2": {
                'en': "MAHSR C3-Section 2",
                'hi': "एमएएचएसआर C3-खंड 2",
                'ta': "எம்.ஏ.ஹெச்.எஸ்.ஆர் C3-பிரிவு 2"
            },
            "MAHSR C3-Section 3": {
                'en': "MAHSR C3-Section 3",
                'hi': "एमएएचएसआर C3-खंड 3",
                'ta': "எம்.ஏ.ஹெச்.எஸ்.ஆர் C3-பிரிவு 3"
            },
            "MAHSR C3-Section 4": {
                'en': "MAHSR C3-Section 4",
                'hi': "एमएएचएसआर C3-खंड 4",
                'ta': "எம்.ஏ.ஹெச்.எஸ்.ஆர் C3-பிரிவு 4"
            },
            "Orange Gate": {
                'en': "Orange Gate",
                'hi': "ऑरेंज गेट",
                'ta': "ஆரஞ்சு கேட்"
            },
            "Patna metro PC03": {
                'en': "Patna metro PC03",
                'hi': "पटना मेट्रो PC03",
                'ta': "பாட்னா மெட்ரோ PC03"
            },
            "Patna metro PC08R": {
                'en': "Patna metro PC08R",
                'hi': "पटना मेट्रो PC08R",
                'ta': "பாட்னா மெட்ரோ PC08R"
            },
            "Agra Metro": {
                'en': "Agra Metro",
                'hi': "आगरा मेट्रो",
                'ta': "ஆக்ரா மெட்ரோ"
            },
            "DMRC DC09": {
                'en': "DMRC DC09",
                'hi': "डीएमआरसी DC09",
                'ta': "டி.எம்.ஆர்.சி DC09"
            },
            "High Speed Rail C4-Section 1": {
                'en': "High Speed Rail C4-Section 1",
                'hi': "हाई स्पीड रेल C4-खंड 1",
                'ta': "அதிவேக ரயில் C4-பிரிவு 1"
            },
            "High Speed Rail C4-Section 2": {
                'en': "High Speed Rail C4-Section 2",
                'hi': "हाई स्पीड रेल C4-खंड 2",
                'ta': "அதிவேக ரயில் C4-பிரிவு 2"
            },
            "High Speed Rail C4-Section 3": {
                'en': "High Speed Rail C4-Section 3",
                'hi': "हाई स्पीड रेल C4-खंड 3",
                'ta': "அதிவேக ரயில் C4-பிரிவு 3"
            },
            "High Speed Rail C4-Section 4": {
                'en': "High Speed Rail C4-Section 4",
                'hi': "हाई स्पीड रेल C4-खंड 4",
                'ta': "அதிவேக ரயில் C4-பிரிவு 4"
            },
            "High Speed Rail C4-Section 5": {
                'en': "High Speed Rail C4-Section 5",
                'hi': "हाई स्पीड रेल C4-खंड 5",
                'ta': "அதிவேக ரயில் C4-பிரிவு 5"
            },
            "MCRP-01 Haji Ali Car Park": {
                'en': "MCRP-01 Haji Ali Car Park",
                'hi': "एमसीआरपी-01 हाजी अली कार पार्क",
                'ta': "எம்.சி.ஆர்.பி-01 ஹாஜி அலி கார் பார்க்கிங்"
            },
            "BARAPULLAH BRIDGE PROJECT": {
                'en': "BARAPULLAH BRIDGE PROJECT",
                'hi': "बारापुला ब्रिज परियोजना",
                'ta': "பாராபுல்லா பாலம் திட்டம்"
            },
            "TWCC Factory": {
                'en': "TWCC Factory",
                'hi': "टीडब्ल्यूसीसी फैक्ट्री",
                'ta': "டி.டபிள்யூ.சி.சி தொழிற்சாலை"
            },
            "KKNPP 5&6 erection package": {
                'en': "KKNPP 5&6 erection package",
                'hi': "केकेएनपीपी 5&6 इरेक्शन पैकेज",
                'ta': "கே.கே.என்.பி.பி 5&6 நிறுவல் தொகுப்பு"
            },
            "PHEP Bhutan": {
                'en': "PHEP Bhutan",
                'hi': "पीएचईपी भूटान",
                'ta': "பி.ஹெச்.ஈ.பி பூட்டான்"
            },
            "LIGO": {
                'en': "LIGO",
                'hi': "लीगो",
                'ta': "லிகோ"
            },
            "Saidongar Pumped Storage Project": {
                'en': "Saidongar Pumped Storage Project",
                'hi': "सैदोंगर पंप्ड स्टोरेज परियोजना",
                'ta': "சைடோங்கர் பம்ப் செய்யப்பட்ட சேமிப்பு திட்டம்"
            },
            "Ethihad Rail - Sharjah University": {
                'en': "Ethihad Rail - Sharjah University",
                'hi': "एतिहाद रेल - शारजाह विश्वविद्यालय",
                'ta': "எதிஹாட் ரயில் - ஷார்ஜா பல்கலைக்கழகம்"
            },
            "Cochin Dry Dock": {
                'en': "Cochin Dry Dock",
                'hi': "कोचीन ड्राई डॉक",
                'ta': "கொச்சி உலர் கப்பல்துறை"
            },
            "Orange Gate Urban Road Tunnel Project": {
                'en': "Orange Gate Urban Road Tunnel Project",
                'hi': "ऑरेंज गेट शहरी सड़क सुरंग परियोजना",
                'ta': "ஆரஞ்சு கேட் நகர்ப்புற சாலை சுரங்கப்பாதை திட்டம்"
            },
            "1500 MW Bhavali PSP": {
                'en': "1500 MW Bhavali PSP",
                'hi': "1500 मेगावाट भावली पीएसपी",
                'ta': "1500 மெகாவாட் பவாலி பி.எஸ்.பி"
            }
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
