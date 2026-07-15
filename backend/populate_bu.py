import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'complaint_portal.settings')
django.setup()

from api.models import Project, Complaint, BusinessUnit, SystemSetting

MAPPING = {
    "1200 MW Teesta III HEP": "HYDEL & TUNNELS",
    "Teesta Sikkim": "HYDEL & TUNNELS",
    "1500 MW Bhavali PSP": "HYDEL & TUNNELS",
    "300 MW Lakhwar Multi-Purpose Project": "HYDEL & TUNNELS",
    "Lakhwar": "HYDEL & TUNNELS",
    "3000 MW Saidongar-1 PSP, Karjat": "HYDEL & TUNNELS",
    "Saidongar Pumped Storage Project": "HYDEL & TUNNELS",
    "Agra Metro": "Urban Transit SBG-Elevated",
    "CMRL C5 ECV02": "Urban Transit SBG-Elevated",
    "CMRL PH II- C5 - ECV02": "Urban Transit SBG-Elevated",
    "CMRL ECV01": "Urban Transit SBG-Elevated",
    "CMRL P2 C4 ECV 01": "Urban Transit SBG-Elevated",
    "CMRL P2 C3 EV 01": "Urban Transit SBG-Elevated",
    "CMRL PH II CP 08 EV01": "Urban Transit SBG-Elevated",
    "CMRL P2-C5 EV 03": "Urban Transit SBG-Elevated",
    "CMRL PH II CP 10 EV03": "Urban Transit SBG-Elevated",
    "CMRL TU02": "UT SBG - Underground",
    "Dibang LOT-2": "HYDEL & TUNNELS",
    "Dibang": "HYDEL & TUNNELS",
    "DMRC-DC09": "UT SBG - Underground",
    "DMRC DC09": "UT SBG - Underground",
    "Etihad Rail – Sharjah University Station Project": "DEFENCE",
    "Ethihad Rail - Sharjah University": "DEFENCE",
    "Extradosed Bridge over Barapullah": "SPECIAL BRIDGES",
    "BARAPULLAH BRIDGE PROJECT": "SPECIAL BRIDGES",
    "Gandhi Sagar PS Project": "HYDEL & TUNNELS",
    "Gandhi Sagar": "HYDEL & TUNNELS",
    "GHAVP": "NUCLEAR & DEFENSE",
    "INRPC, NRB, BARC, Tarapur": "NUCLEAR & DEFENSE",
    "Control Building at BARC Tarapur": "NUCLEAR & DEFENSE",
    "KKNPP 5 & 6 SFSF": "NUCLEAR & DEFENSE",
    "KKNPP 5&6 erection package": "NUCLEAR & DEFENSE",
    "Kolkatta Metro UG1": "UT SBG - Underground",
    "KUDANKULAM PROJECT HTS": "PORTS & HARBOURS",
    "KUDANKULAM PROJECT HTS & SFSF": "PORTS & HARBOURS",
    "KUDANKULAM PROJECT 5&6 MEP": "NUCLEAR & DEFENSE",
    "KUDANKULAM PROJECT RB 3&4": "NUCLEAR & DEFENSE",
    "KUDANKULAM PROJECT RB 5&6": "NUCLEAR & DEFENSE",
    "Lower Kopili HEP": "HYDEL & TUNNELS",
    "Kopili HEP": "HYDEL & TUNNELS",
    "MAHSR C4 Section 5": "MAHSR C4 TFL",
    "High Speed Rail C4-Section 5": "MAHSR C4 TFL",
    "MAHSR C5": "Urban Transit SBG-Elevated",
    "MAHSR C3 Section 1": "MAHSR C3",
    "MAHSR C3-Section 1": "MAHSR C3",
    "MAHSR C3 Section 2": "MAHSR C3",
    "MAHSR C3-Section 2": "MAHSR C3",
    "MAHSR C3 Section 3": "MAHSR C3",
    "MAHSR C3-Section 3": "MAHSR C3",
    "MAHSR C3 Section 4": "MAHSR C3",
    "MAHSR C3-Section 4": "MAHSR C3",
    "MAHSR C4 Section 1": "MAHSR C4 TFL",
    "High Speed Rail C4-Section 1": "MAHSR C4 TFL",
    "MAHSR C4 Section 2": "MAHSR C4 TFL",
    "High Speed Rail C4-Section 2": "MAHSR C4 TFL",
    "MAHSR C4 Section 3": "MAHSR C4 TFL",
    "High Speed Rail C4-Section 3": "MAHSR C4 TFL",
    "MAHSR C4 Section 4": "MAHSR C4 TFL",
    "High Speed Rail C4-Section 4": "MAHSR C4 TFL",
    "MCRP 01": "Mumbai Jobs",
    "MCRP-01 Haji Ali Car Park": "Mumbai Jobs",
    "MMRC UGC01 - LNT-STEC JV": "UT SBG - Underground",
    "MUMBAI METRO UGC01": "UT SBG - Underground",
    "Orange Gate": "Orange Gate",
    "Orange Gate Urban Road Tunnel Project": "Orange Gate",
    "PAKALDUL HEP": "HYDEL & TUNNELS",
    "Pakaldul HEP": "HYDEL & TUNNELS",
    "Patna PC08R": "UT SBG - Underground",
    "Patna metro PC08R": "UT SBG - Underground",
    "Patna UG Metro PC-03": "UT SBG - Underground",
    "Patna metro PC03": "UT SBG - Underground",
    "PHEP Bhutan": "HYDEL & TUNNELS",
    "Riyadh": "HEAVY CIVIL INFRA (COMMON)",
    "RVNL Package 4": "HYDEL & TUNNELS",
    "RVNL-pkg 4": "HYDEL & TUNNELS",
    "RVNL Package 02": "HYDEL & TUNNELS",
    "RVNL 2": "HYDEL & TUNNELS",
    "Seabird Package MWC04": "NUCLEAR & DEFENSE",
    "SEA BIRD PROJECT-MWc04": "NUCLEAR & DEFENSE",
    "TWCC Factory Kanchipuram": "HEAVY CIVIL INFRA (COMMON)",
    "TWCC Factory": "HEAVY CIVIL INFRA (COMMON)",
    "Vizag Vessel": "NUCLEAR & DEFENSE",
    "VIZAG VESSEL PROJECT": "NUCLEAR & DEFENSE"
}

def run():
    updated_projects = 0
    for project in Project.objects.all():
        name = project.name
        matched_bu = None
        
        # Try exact match first
        if name in MAPPING:
            matched_bu = MAPPING[name]
        else:
            # Try fuzzy match
            for key, val in MAPPING.items():
                if key.lower() in name.lower() or name.lower() in key.lower():
                    matched_bu = val
                    break
        
        if matched_bu:
            project.business_unit = matched_bu
            project.save()
            updated_projects += 1
            
    # Sync business units in complaints
    for complaint in Complaint.objects.all():
        if complaint.project:
            complaint.business_unit = complaint.project.business_unit
            complaint.save()

    # Create BusinessUnit model records from distinct Project business_units
    distinct_bus = Project.objects.exclude(business_unit='').values_list('business_unit', flat=True).distinct()
    created_bus = 0
    for bu_name in distinct_bus:
        bu_obj, created = BusinessUnit.objects.get_or_create(name=bu_name, defaults={'is_active': True})
        if created:
            created_bus += 1
            
    # Seed default system settings
    default_settings = [
        ("SPEECH_PROVIDER", "OpenAI", "AI engine provider for voice processing (OpenAI or Gemini)"),
        ("TRANSLATION_PROVIDER", "OpenAI", "AI engine provider for text translations (OpenAI or Gemini)"),
        ("LOW_CONFIDENCE_THRESHOLD", "0.70", "Similarity confidence threshold below which warnings are triggered"),
        ("AUTO_VERIFY", "True", "Whether translations should be automatically verified against Whisper transcripts"),
    ]
    created_settings = 0
    for key, value, desc in default_settings:
        sett_obj, created = SystemSetting.objects.get_or_create(key=key, defaults={'value': value, 'description': desc})
        if created:
            created_settings += 1

    print(f"Seeding completed: Updated {updated_projects} projects. Created {created_bus} BusinessUnit records. Seeded {created_settings} system settings.")

if __name__ == '__main__':
    run()
