from rest_framework import serializers
from .models import SiteSettings

class SiteSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = SiteSettings
        fields = ['promo_banner_title', 'promo_banner_subtitle', 'promo_banner_button_text', 'promo_banner_image']
