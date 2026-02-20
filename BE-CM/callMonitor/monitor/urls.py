from django.urls import path
from . import views

urlpatterns = [
    path('api/monitorings/', views.create_monitoring, name='create_monitoring'),
]
