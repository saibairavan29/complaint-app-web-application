from django.core.management.base import BaseCommand
from api.models import Project, Complaint

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
    "Ethihad Rail \u2013 Sharjah University Station Project": "DEFENCE",
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
    "Lower Kopili HEP": "HYDEL & TUNNELS",
    "MAHSR C5": "Urban Transit SBG-Elevated",
    "MAHSR C3-Section 1": "MAHSR C3",
    "MAHSR C3-Section 2": "MAHSR C3",
    "MAHSR C3-Section 3": "MAHSR C3",
    "MAHSR C3-Section 4": "MAHSR C3",
    "MAHSR C4 Section 5": "MAHSR C4 TFL",
    "High Speed Rail C4-Section 1": "MAHSR C4 TFL",
    "High Speed Rail C4-Section 2": "MAHSR C4 TFL",
    "High Speed Rail C4-Section 3": "MAHSR C4 TFL",
    "High Speed Rail C4-Section 4": "MAHSR C4 TFL",
    "High Speed Rail C4-Section 5": "MAHSR C4 TFL",
    "MCRP-01 Haji Ali Car Park": "Mumbai Jobs",
    "MCRP 01": "Mumbai Jobs",
    "MUMBAI METRO UGC01": "UT SBG - Underground",
    "MMRC UGC01 - LNT-STEC JV": "UT SBG - Underground",
    "Orange Gate": "Orange Gate",
    "Orange Gate Urban Road Tunnel Project": "Orange Gate",
    "Pakaldul HEP": "HYDEL & TUNNELS",
    "PAKALDUL HEP": "HYDEL & TUNNELS",
    "Patna metro PC03": "UT SBG - Underground",
    "Patna UG Metro PC-03": "UT SBG - Underground",
    "Patna metro PC08R": "UT SBG - Underground",
    "Patna PC08R": "UT SBG - Underground",
    "PHEP Bhutan": "HYDEL & TUNNELS",
    "RVNL 2": "HYDEL & TUNNELS",
    "RVNL Package 02": "HYDEL & TUNNELS",
    "RVNL-pkg 4": "HYDEL & TUNNELS",
    "RVNL Package 4": "HYDEL & TUNNELS",
    "SEA BIRD PROJECT-MWc04": "NUCLEAR & DEFENSE",
    "Seabird Package MWC04": "NUCLEAR & DEFENSE",
    "Teesta Sikkim": "HYDEL & TUNNELS",
    "1200 MW Teesta III HEP Sikkim": "HYDEL & TUNNELS",
    "TWCC Factory": "HEAVY CIVIL INFRA (COMMON)",
    "TWCC Factory Kanchipuram": "HEAVY CIVIL INFRA (COMMON)",
    "VIZAG VESSEL PROJECT": "NUCLEAR & DEFENSE",
    "Vizag Vessel": "NUCLEAR & DEFENSE",
    "Cochin Dry Dock": "NUCLEAR & DEFENSE",
    "LIGO": "NUCLEAR & DEFENSE",
    "Riyadh": "HEAVY CIVIL INFRA (COMMON)",
    "Dibang LOT-2": "HYDEL & TUNNELS",
}


class Command(BaseCommand):
    help = "Updates business_unit on all existing Project records and propagates to Complaint snapshots"

    def handle(self, *args, **options):
        updated_projects = 0
        for project in Project.objects.all():
            bu = BU_MAP.get(project.name, "")
            if bu and project.business_unit != bu:
                project.business_unit = bu
                project.save(update_fields=["business_unit"])
                updated_projects += 1
                self.stdout.write(f"  Updated: {project.name!r} -> {bu!r}")

        # Propagate BU snapshot to complaints that have an empty business_unit
        updated_complaints = 0
        for complaint in Complaint.objects.filter(business_unit="").select_related("project"):
            if complaint.project and complaint.project.business_unit:
                complaint.business_unit = complaint.project.business_unit
                complaint.save(update_fields=["business_unit"])
                updated_complaints += 1

        self.stdout.write(self.style.SUCCESS(
            f"Done. Updated {updated_projects} projects, {updated_complaints} complaint snapshots."
        ))
