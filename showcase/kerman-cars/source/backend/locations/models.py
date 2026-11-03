from django.db import models


class Province(models.Model):
    name = models.CharField(max_length=100, unique=True, verbose_name="نام استان")
    is_active = models.BooleanField(default=True, verbose_name="فعال")

    class Meta:
        verbose_name = "استان"
        verbose_name_plural = "استان‌ها"
        ordering = ["name"]

    def __str__(self):
        return self.name


class City(models.Model):
    province = models.ForeignKey(
        Province,
        on_delete=models.PROTECT,
        related_name="cities",
        verbose_name="استان",
    )
    name = models.CharField(max_length=100, verbose_name="نام شهر")
    is_active = models.BooleanField(default=True, verbose_name="فعال")

    class Meta:
        verbose_name = "شهر"
        verbose_name_plural = "شهرها"
        ordering = ["province__name", "name"]
        constraints = [
            models.UniqueConstraint(
                fields=["province", "name"],
                name="uniq_city_name_per_province",
            ),
        ]

    def __str__(self):
        return f"{self.name} - {self.province.name}"


class Neighborhood(models.Model):
    city = models.ForeignKey(
        City,
        on_delete=models.PROTECT,
        related_name="neighborhoods",
        verbose_name="شهر",
    )
    name = models.CharField(
        max_length=100,
        verbose_name="نام محله",
    )
    is_active = models.BooleanField(
        default=True,
        verbose_name="فعال",
    )

    class Meta:
        verbose_name = "محله"
        verbose_name_plural = "محله‌ها"
        ordering = ["city__name", "name"]
        constraints = [
            models.UniqueConstraint(
                fields=["city", "name"],
                name="uniq_neighborhood_name_per_city",
            ),
        ]

    def __str__(self):
        return f"{self.city.name} - {self.name}"
