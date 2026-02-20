from django.contrib import admin
from .models import MonitoringEntry

@admin.register(MonitoringEntry)
class MonitoringEntryAdmin(admin.ModelAdmin):
    list_display = ('id','created','total_scorable','total_scored','quality_percent')
    readonly_fields = ('created',)
