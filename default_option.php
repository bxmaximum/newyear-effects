<?php

declare(strict_types=1);

$newyear_effects_default_option = [
    'enabled' => 'Y',
    'schedule_mode' => 'always',
    'schedule_start' => '12-15',
    'schedule_end' => '01-15',
    'exclude_urls' => "/personal/order/*\n/basket/*\n/auth/*",
    'mobile_mode' => 'eco',
    'performance_mode' => 'auto',
    'respect_reduced_motion' => 'Y',

    'snow_enabled' => 'Y',
    'snow_intensity' => '55',
    'snow_speed' => '4',
    'snow_size_min' => '6',
    'snow_size_max' => '18',
    'snow_wind' => '3',
    'snow_interactive' => 'Y',
    'snow_depth' => 'Y',
    'snow_color' => '#ffffff',

    'garland_enabled' => 'Y',
    'garland_selector' => 'header, .header, #header',
    'garland_mode' => 'twinkle',
    'garland_palette' => 'warm_gold',
    'garland_colors' => '#ff4d4f,#36cfc9,#fadb14,#52c41a,#b37feb',
    'garland_speed' => '1200',
    'garland_offset_top' => '0',
    'garland_interactive' => 'Y',

    'decorations_enabled' => 'Y',
    'decorations_selector' => '.logo, #logo, .site-logo',
    'decorations_type' => 'hat',
    'decorations_position' => 'top-right',
    'decorations_size' => 'md',

    'frost_enabled' => 'Y',
    'frost_opacity' => '35',
    'sparkles_enabled' => 'N',
    'widget_mode' => 'countdown',
    'widget_position' => 'bottom-right',
];
