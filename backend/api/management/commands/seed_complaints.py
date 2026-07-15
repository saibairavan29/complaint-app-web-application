from django.core.management.base import BaseCommand
from api.models import Project, Location, Complaint
import random
from datetime import timedelta
from django.utils import timezone

class Command(BaseCommand):
    help = "Seeds the database with realistic mock complaints for dashboard testing"

    def handle(self, *args, **options):
        # 1. Check if projects exist
        projects = list(Project.objects.all())
        if not projects:
            self.stdout.write(self.style.ERROR("No projects found in the database. Please run python manage.py seed_projects first."))
            return

        categories = [
            "water", 
            "electricity", 
            "toilet", 
            "room", 
            "safety", 
            "health",
            "food",
            "other"
        ]

        languages = ["en", "hi", "ta", "te", "mr", "or"]

        statuses = ["Pending", "In Progress", "Completed", "Resolved", "Rejected"]

        transcripts = {
            "water": (
                "यहाँ पीने के पानी की टंकी बहुत गंदी है और पिछले दो दिनों से पानी में से बदबू आ रही है। कृपया इसे जल्द से जल्द साफ करवाएं।",
                "The drinking water tank here is very dirty and the water has been smelling bad for the last two days. Please get it cleaned as soon as possible."
            ),
            "electricity": (
                "हमारे रूम नंबर ४ में बिजली कल रात से नहीं आ रही है। पंखा बंद होने के कारण बहुत गर्मी लग रही है और हम सो नहीं पा रहे हैं।",
                "There is no electricity in our room number 4 since last night. Because the fan is off, it is very hot and we cannot sleep."
            ),
            "toilet": (
                "टॉयलेट ब्लॉक बी में नल टूट गया है और लगातार पानी बह रहा है। फर्श बहुत गंदा और फिसलन भरा हो गया है। कृपया इसे ठीक करें।",
                "The tap in toilet block B is broken and water is continuously running. The floor has become very dirty and slippery. Please repair it."
            ),
            "room": (
                "हमारे कमरे की खिड़की का कांच टूट गया है जिससे ठंडी हवा और कीड़े अंदर आ रहे हैं। कृपया खिड़की को बदलवा दें।",
                "Our room window pane is broken due to which cold wind and insects are coming inside. Please get the window replaced."
            ),
            "safety": (
                "साइट पर काम करते समय हमें पूरे सेफ्टी बेल्ट नहीं मिल रहे हैं। कुछ बेल्ट्स बहुत पुराने और कमजोर हैं। यह खतरनाक है।",
                "We are not getting complete safety belts while working on site. Some belts are very old and weak. This is dangerous."
            ),
            "health": (
                "शिविर में दो दिनों से प्राथमिक चिकित्सा किट में दवाएं नहीं हैं। एक मजदूर को चोट लगने पर भी दवा उपलब्ध नहीं थी।",
                "There are no medicines in the first aid kit in the camp for two days. No medicine was available even when a worker got injured."
            ),
            "food": (
                "मेस में मिलने वाला खाना ठीक से पका नहीं होता है और कल रात की रोटी से अजीब सी गंध आ रही थी। हमारी सेहत खराब हो सकती है।",
                "The food served in the mess is not cooked properly and last night's roti was smelling weird. Our health could deteriorate."
            ),
            "other": (
                "वाईफाई नेटवर्क पिछले ३ दिनों से बहुत धीमा चल रहा है। हम अपने परिवार से ठीक से वीडियो कॉल या बात नहीं कर पा रहे हैं।",
                "The WiFi network is running very slow for the last 3 days. We are not able to video call or talk to our family properly."
            )
        }

        photo_urls = [
            "https://res.cloudinary.com/demo/image/upload/v1570000000/sample_welfare_photo.jpg",
            "https://res.cloudinary.com/demo/image/upload/w_400,h_300,c_fill/v1570000000/sample_welfare_block.jpg",
            "https://res.cloudinary.com/demo/image/upload/w_400,h_300,c_fill/v1570000000/sample_leak.jpg"
        ]

        audio_urls = [
            "https://res.cloudinary.com/demo/video/upload/v1570000000/sample_welfare_voice.webm",
            "https://res.cloudinary.com/demo/video/upload/v1570000000/sample_audio_welfare_2.webm"
        ]

        self.stdout.write(self.style.NOTICE("Creating 40 realistic mock complaints..."))

        complaints_created = 0
        now = timezone.now()

        for i in range(40):
            project = random.choice(projects)
            locations = list(project.locations.all())
            location = random.choice(locations) if locations else None
            
            if not location:
                continue

            category = random.choice(categories)
            lang = random.choice(languages)
            status_val = random.choice(statuses)

            # Retrieve text and translation corresponding to category
            orig_text, eng_translation = transcripts.get(category, transcripts["other"])

            # 50% chance of photo, 50% chance of audio
            has_photo = random.choice([True, False])
            has_audio = random.choice([True, False])

            photo = random.choice(photo_urls) if has_photo else None
            audio = random.choice(audio_urls) if has_audio else None

            # Generate unique Reference Number format: CMP-YYYY-XXXXX
            year = now.year
            rand_code = random.randint(10000, 99999)
            ref_num = f"CMP-{year}-{rand_code}"
            
            while Complaint.objects.filter(reference_number=ref_num).exists():
                rand_code = random.randint(10000, 99999)
                ref_num = f"CMP-{year}-{rand_code}"

            # Create complaint object
            sub_type = 'TEXT_AND_VOICE' if audio else 'TEXT'
            complaint = Complaint.objects.create(
                project=project,
                location=location,
                category=category,
                language=lang,
                status=status_val,
                photo_url=photo,
                audio_url=audio,
                original_text=orig_text,
                english_translation=eng_translation,
                reference_number=ref_num,
                has_audio=bool(audio),
                submission_type=sub_type,
                transcription_status='COMPLETED' if audio else 'COMPLETED',
                translation_status='COMPLETED'
            )

            # Assign historical date
            random_days = random.randint(0, 90)
            random_hours = random.randint(0, 23)
            random_minutes = random.randint(0, 59)
            created_at = now - timedelta(days=random_days, hours=random_hours, minutes=random_minutes)
            
            # 80% chance it has an update timestamp close to creation, 20% it has a later update timestamp
            if status_val == "Pending":
                updated_at = created_at
            else:
                updated_at = created_at + timedelta(days=random.randint(0, min(5, random_days)), hours=random.randint(1, 12))

            # Force update dates via update query to bypass auto_now_add / auto_now triggers
            Complaint.objects.filter(id=complaint.id).update(created_at=created_at, updated_at=updated_at)
            complaints_created += 1

        self.stdout.write(self.style.SUCCESS(f"Successfully seeded {complaints_created} mock complaints in the database."))
