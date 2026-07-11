# This module provides backward-compatible exports for the renamed models
# The actual ORM classes MobOS and MobPneu remain defined in backend/app/models/mobos.py
from .mobos import Coleta, ColetaPneu

# Maintain backward compatibility for MobOS/MobPneu names
MobOS = Coleta
MobPneu = ColetaPneu

__all__ = ["MobOS", "MobPneu", "Coleta", "ColetaPneu"]
