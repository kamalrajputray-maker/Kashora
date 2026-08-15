from django.db import models

class SiteSettings(models.Model):
    promo_banner_title = models.CharField(max_length=255, default="UP TO 35% OFF")
    promo_banner_subtitle = models.CharField(max_length=255, default="ON FIRST ORDER")
    promo_banner_button_text = models.CharField(max_length=100, default="Download Now")
    promo_banner_image = models.ImageField(upload_to="banners/", null=True, blank=True)

    class Meta:
        verbose_name_plural = "Site Settings"

    def __str__(self):
        return "Global Site Settings"

    def save(self, *args, **kwargs):
        # Ensure only one record exists
        if SiteSettings.objects.exists() and not self.pk:
            return
        super().save(*args, **kwargs)

    @classmethod
    def get_settings(cls):
        settings, created = cls.objects.get_or_create(pk=1)
        return settings
