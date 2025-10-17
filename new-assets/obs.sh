#!/bin/bash
# OBS Studio Core Dependencies on Kali Linux

echo "=== MULTIMEDIA & ENCODING ==="
dependencies=(
    "libavcodec60"          # FFmpeg video codec
    "libavformat61"         # FFmpeg container format
    "libavutil59"           # FFmpeg utilities
    "libswscale7"           # FFmpeg scaling
    "libswresample4"        # FFmpeg resampling
    "libx264-dev"           # H.264 encoding
    "libx265-dev"           # H.265 encoding
    "ffmpeg"                # Complete FFmpeg suite
)

echo "=== GRAPHICS & DISPLAY ==="
graphics_deps=(
    "libqt5gui5"            # Qt5 GUI
    "libqt5widgets5"        # Qt5 widgets
    "libqt5core5a"          # Qt5 core
    "libgl1-mesa-glx"       # OpenGL
    "libgles2-mesa"         # OpenGL ES
    "libegl1-mesa"          # EGL
    "libfontconfig1"        # Font configuration
    "libfreetype6"          # Font rendering
    "libxcb1"               # X11 bindings
    "libx11-6"              # X11 client
    "libxcomposite1"        # X composite
    "libxdamage1"           # X damage
    "libxfixes3"            # X fixes
    "libxrandr2"            # X randr
)

echo "=== AUDIO ==="
audio_deps=(
    "libpulse0"             # PulseAudio
    "libasound2"            # ALSA
    "libsndfile1"           # Sound file library
    "libspeex1"             # Speex audio codec
    "libvorbis0a"           # Vorbis audio
    "libvorbisenc2"         # Vorbis encoder
    "libopus0"              # Opus codec
)

echo "=== NETWORK & UTILITIES ==="
network_deps=(
    "libcurl4"              # HTTP client
    "libssl3"               # OpenSSL
    "libjansson4"           # JSON library
    "libc6"                 # GNU C Library
    "libgcc-s1"             # GCC runtime
    "libstdc++6"            # C++ standard library
)

echo "=== SYSTEM LIBRARIES ==="
system_deps=(
    "libglib2.0-0"          # GLib
    "libgdk-pixbuf-2.0-0"   # GDK Pixbuf
    "libgtk-3-0"            # GTK3
    "libwayland-client0"    # Wayland
    "libudev1"              # udev
    "libdbus-1-3"           # D-Bus
)

# Print all categories
printf "\n%s\n" "${dependencies[@]}" "${graphics_deps[@]}" "${audio_deps[@]}" "${network_deps[@]}" "${system_deps[@]}"
