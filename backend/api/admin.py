from django.contrib import admin
from django.utils.html import format_html
from api.models import Project, Location, Complaint, Category, Language, BusinessUnit, SystemSetting

@admin.register(BusinessUnit)
class BusinessUnitAdmin(admin.ModelAdmin):
    list_display = ('name', 'is_active', 'created_at')
    list_filter = ('is_active',)
    search_fields = ('name',)

@admin.register(SystemSetting)
class SystemSettingAdmin(admin.ModelAdmin):
    list_display = ('key', 'value', 'description', 'updated_at')
    search_fields = ('key', 'value')


@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = ('name', 'business_unit', 'is_active', 'created_at')
    list_filter = ('is_active', 'business_unit', 'created_at')
    search_fields = ('name', 'business_unit')
    list_per_page = 25


@admin.register(Location)
class LocationAdmin(admin.ModelAdmin):
    list_display = ('name', 'project', 'is_active', 'created_at')
    list_filter = ('is_active', 'project', 'created_at')
    search_fields = ('name', 'project__name')
    list_per_page = 25


@admin.register(Complaint)
class ComplaintAdmin(admin.ModelAdmin):
    list_display = (
        'reference_number', 
        'project',
        'business_unit',
        'location', 
        'category', 
        'language', 
        'status', 
        'created_at',
        'updated_at',
        'photo_link',
        'audio_link'
    )
    list_filter = ('status', 'category', 'language', 'business_unit', 'project', 'created_at', 'updated_at')
    search_fields = (
        'reference_number', 
        'original_text', 
        'english_translation', 
        'project__name', 
        'location__name'
    )
    readonly_fields = ('reference_number', 'created_at', 'updated_at')
    list_per_page = 20

    # Fields structure for detail view
    fieldsets = (
        ('Reference Info', {
            'fields': ('reference_number', 'status', 'created_at', 'updated_at')
        }),
        ('Location Details', {
            'fields': ('project', 'business_unit', 'location')
        }),
        ('Issue Classification', {
            'fields': ('category', 'language')
        }),
        ('Media Attachments', {
            'fields': ('photo_url', 'audio_url'),
            'description': 'Cloud storage links for uploaded photos and voice recordings.'
        }),
        ('Transcription & Translation', {
            'fields': ('original_text', 'english_translation'),
            'description': 'Whisper Speech-to-Text and translation output variables.'
        }),
    )

    def photo_link(self, obj):
        if obj.photo_url:
            return format_html('<a href="{}" target="_blank">View Photo</a>', obj.photo_url)
        return "-"
    photo_link.short_description = "Photo"

    def audio_link(self, obj):
        if obj.audio_url:
            return format_html('<a href="{}" target="_blank">Play Audio</a>', obj.audio_url)
        return "-"
    audio_link.short_description = "Audio"


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ('slug', 'label', 'is_active', 'sort_order')
    list_filter = ('is_active',)
    search_fields = ('slug', 'label')


@admin.register(Language)
class LanguageAdmin(admin.ModelAdmin):
    list_display = ('code', 'name', 'is_active', 'sort_order')
    list_filter = ('is_active',)
    search_fields = ('code', 'name')


# --- Secure and Customise Django Admin Site ---
# Restrict admin access strictly to developers and system administrators (Superusers)
admin.site.has_permission = lambda request: request.user.is_active and request.user.is_superuser

# Set custom headers, titles, and emergency recovery descriptions
admin.site.site_header = format_html(
    'Worker Welfare Portal Developer Admin | <a href="{}" '
    'style="color: #f59e0b; text-decoration: underline; font-weight: bold; margin-left: 15px;">Admin Dashboard</a>',
    'http://localhost:3000/admin-dashboard'
)
admin.site.site_title = "Developer Admin Portal"
admin.site.index_title = "Database Administration & Emergency Recovery Console"

