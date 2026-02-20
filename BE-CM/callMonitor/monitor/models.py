from django.db import models


class MonitoringEntry(models.Model):
    created = models.DateTimeField(auto_now_add=True)
    data = models.JSONField(null=True, blank=True)
    total_scorable = models.FloatField(default=0)
    total_scored = models.FloatField(default=0)
    quality_percent = models.FloatField(default=0)

    def __str__(self):
        return f"MonitoringEntry {self.id} - {self.created.isoformat()}"
