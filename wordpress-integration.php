<?php
/**
 * Plugin Name: Après Ski Reservation Widget
 * Description: Integrate table reservations for your après-ski bar
 * Version: 1.0.0
 * Author: Your Name
 */

if (!defined('ABSPATH')) {
    exit;
}

class ApresSkiReservationWidget extends WP_Widget {

    public function __construct() {
        parent::__construct(
            'apreski_reservation_widget',
            'Après Ski Reservations',
            array('description' => 'Display the reservation widget for your après-ski bar')
        );
    }

    public function widget($args, $instance) {
        echo $args['before_widget'];

        if (!empty($instance['title'])) {
            echo $args['before_title'] . apply_filters('widget_title', $instance['title']) . $args['after_title'];
        }

        $app_url = !empty($instance['app_url']) ? esc_url($instance['app_url']) : '';

        if (empty($app_url)) {
            echo '<p>Please configure the widget with your reservation app URL.</p>';
        } else {
            echo '<div id="apreski-reservation-widget"></div>';
            echo '<script>
                (function() {
                    var iframe = document.createElement("iframe");
                    iframe.src = "' . $app_url . '/widget";
                    iframe.style.width = "100%";
                    iframe.style.minHeight = "700px";
                    iframe.style.border = "none";
                    iframe.style.borderRadius = "16px";
                    document.getElementById("apreski-reservation-widget").appendChild(iframe);

                    window.addEventListener("message", function(event) {
                        if (event.data && event.data.type === "resize") {
                            iframe.style.height = event.data.height + "px";
                        }
                    });
                })();
            </script>';
        }

        echo $args['after_widget'];
    }

    public function form($instance) {
        $title = !empty($instance['title']) ? $instance['title'] : 'Reserve Your Table';
        $app_url = !empty($instance['app_url']) ? $instance['app_url'] : '';
        ?>
        <p>
            <label for="<?php echo $this->get_field_id('title'); ?>">Title:</label>
            <input class="widefat" id="<?php echo $this->get_field_id('title'); ?>"
                   name="<?php echo $this->get_field_name('title'); ?>"
                   type="text" value="<?php echo esc_attr($title); ?>">
        </p>
        <p>
            <label for="<?php echo $this->get_field_id('app_url'); ?>">Reservation App URL:</label>
            <input class="widefat" id="<?php echo $this->get_field_id('app_url'); ?>"
                   name="<?php echo $this->get_field_name('app_url'); ?>"
                   type="url" value="<?php echo esc_attr($app_url); ?>"
                   placeholder="https://your-app.com">
            <small>Enter the URL where your reservation app is hosted</small>
        </p>
        <?php
    }

    public function update($new_instance, $old_instance) {
        $instance = array();
        $instance['title'] = (!empty($new_instance['title'])) ? strip_tags($new_instance['title']) : '';
        $instance['app_url'] = (!empty($new_instance['app_url'])) ? esc_url_raw($new_instance['app_url']) : '';
        return $instance;
    }
}

function register_apreski_reservation_widget() {
    register_widget('ApresSkiReservationWidget');
}
add_action('widgets_init', 'register_apreski_reservation_widget');

function apreski_reservation_shortcode($atts) {
    $atts = shortcode_atts(array(
        'url' => '',
        'height' => '700px',
    ), $atts);

    if (empty($atts['url'])) {
        return '<p>Please provide a URL for the reservation system.</p>';
    }

    $output = '<div class="apreski-reservation-shortcode">';
    $output .= '<iframe src="' . esc_url($atts['url']) . '/widget" ';
    $output .= 'style="width: 100%; min-height: ' . esc_attr($atts['height']) . '; border: none; border-radius: 16px;"';
    $output .= '></iframe>';
    $output .= '</div>';

    return $output;
}
add_shortcode('apreski_reservations', 'apreski_reservation_shortcode');
