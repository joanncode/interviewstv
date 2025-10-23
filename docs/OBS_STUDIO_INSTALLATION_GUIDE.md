# OBS Studio Installation Guide for Kali Linux

## Overview
This document provides a comprehensive guide for installing OBS Studio on Kali Linux, including troubleshooting package manager issues and dependency conflicts that commonly occur.

## Problem Statement
Installing OBS Studio on Kali Linux presents several challenges:
- Qt6 dependency conflicts in the package manager
- Broken package dependencies
- AppImage download issues
- Flatpak repository problems

## Solution Summary
**Final Working Solution**: Snap package installation after fixing the Kali package manager.

## Detailed Installation Process

### Step 1: Fix Kali Package Manager Issues

#### 1.1 Initial Problem
When attempting to install OBS Studio, encountered these errors:
```bash
sudo apt install obs-studio
# Error: Unsatisfied dependencies:
# kio6 : Depends: qt6-base-private-abi (= 6.7.2)
# Error, pkgProblemResolver::Resolve generated breaks
```

#### 1.2 Fix Broken Packages
```bash
# Fix broken package dependencies
sudo apt --fix-broken install
```

**Result**: Successfully upgraded 11 packages and installed 5 new dependencies:
- gstreamer1.0-pipewire
- libabsl20240722
- libebur128-1
- libfftw3-single3
- libwebrtc-audio-processing-1-3

#### 1.3 Install Essential Dependencies
```bash
# Install FFmpeg (required for streaming)
sudo apt install ffmpeg
```

**Result**: Successfully installed FFmpeg 7.1.2-1+b1 with 17 package upgrades and 14 new packages.

### Step 2: Attempted Installation Methods (Failed)

#### 2.1 Direct APT Installation (Failed)
```bash
sudo apt install obs-studio
# Still failed due to Qt6 dependency conflicts
```

#### 2.2 Ubuntu .deb Package (Failed)
```bash
# Downloaded OBS Studio 31.1.1 Ubuntu .deb package (128MB)
wget -O obs-studio-31.1.1.deb "https://github.com/obsproject/obs-studio/releases/download/31.1.1/OBS-Studio-31.1.1-Ubuntu-24.04-x86_64.deb"

sudo dpkg -i obs-studio-31.1.1.deb
# Failed: dependency conflicts with newer FFmpeg version in Kali
```

#### 2.3 AppImage Download (Failed)
```bash
# Multiple AppImage URLs returned 404 errors
wget -O obs-studio.AppImage "https://github.com/obsproject/obs-studio/releases/download/31.1.1/OBS-Studio-31.1.1-x86_64.AppImage"
# Error 404: Not Found
```

#### 2.4 Flatpak Installation (Failed)
```bash
# Install Flatpak
sudo apt install flatpak
flatpak remote-add --if-not-exists flathub https://flathub.org/repo/flathub.flatpakrepo
flatpak install flathub com.obsproject.Studio
# Error: No remote refs found for 'flathub'
```

### Step 3: Successful Snap Installation

#### 3.1 Install Snapd
```bash
sudo apt install snapd
```

**Result**: Successfully installed snapd (19.0 MB download).

#### 3.2 Enable Snapd Service
```bash
sudo systemctl enable --now snapd.socket
```

#### 3.3 Install OBS Studio via Snap
```bash
# Wait for snapd to initialize, then install
sleep 10 && sudo snap install obs-studio
```

**Installation Process**:
1. Downloaded snapd core (53MB)
2. Downloaded core24 base (69MB) 
3. Downloaded obs-studio (245MB)
4. Configured security profiles
5. Connected plugs and slots

**Final Result**: OBS Studio 32.0.0 successfully installed!

### Step 4: Verification and Setup

#### 4.1 Verify Installation
```bash
snap list obs-studio
# Output: obs-studio 32.0.0 1314 latest/stable snapcrafters✪
```

#### 4.2 Fix PATH Issue
```bash
# Snap binaries not in PATH by default
export PATH=$PATH:/snap/bin
obs-studio --version
# Output: OBS Studio - 32.0.0
```

#### 4.3 Create Launch Script
Created `test-obs-rtmp.sh` with:
- Automatic PATH configuration
- RTMP server details
- Setup instructions
- Launch command

### Step 5: RTMP Configuration

#### 5.1 RTMP Server Details
- **Server URL**: `rtmp://localhost:1935/live`
- **Stream Key**: `test-stream-key`
- **HLS Output**: `http://localhost:8080/live/test-stream-key/index.m3u8`

#### 5.2 OBS Studio Configuration
1. Settings → Stream
2. Service: Custom
3. Server: `rtmp://localhost:1935/live`
4. Stream Key: `test-stream-key`

## Technical Details

### System Information
- **OS**: Kali Linux (Debian-based)
- **Kernel**: Linux 6.11.2-amd64
- **CPU**: Intel Celeron N4120 @ 1.10GHz
- **Memory**: 3734MB Total
- **Graphics**: Intel UHD Graphics 600

### OBS Studio Capabilities
- **Version**: 32.0.0 (latest stable)
- **Platform**: Wayland
- **OpenGL**: 4.6 (Core Profile) Mesa 25.0.7
- **Video Encoders**: x264, VAAPI H.264/HEVC, QuickSync
- **Audio**: PulseAudio on PipeWire 1.2.6

### Dependencies Resolved
- **Qt Version**: 6.4.2 (runtime and compiled)
- **CEF Version**: 127.0.6533.120 (for browser sources)
- **VLC**: 3.0.20 Vetinari (for VLC video source)

## Troubleshooting Notes

### Common Issues and Solutions

1. **Qt6 Dependency Conflicts**
   - Solution: Use Snap instead of APT
   - Snap packages are self-contained and avoid system conflicts

2. **PATH Issues with Snap**
   - Solution: `export PATH=$PATH:/snap/bin`
   - Add to `.bashrc` for permanent fix

3. **Library Loading Warnings**
   - Warnings about libpxbackend and gdk-pixbuf are cosmetic
   - Do not affect OBS functionality

4. **RTMP Stream Key Validation**
   - Streaming server may reject unknown stream keys
   - Use `test-stream-key` for testing
   - Configure proper stream key validation in production

## Files Created

1. **`test-obs-rtmp.sh`** - Launch script with RTMP configuration
2. **`obs-setup-guide.html`** - Web-based setup guide
3. **`rtmp-test-setup.html`** - RTMP monitoring interface

## Success Metrics

- ✅ OBS Studio 32.0.0 installed and functional
- ✅ RTMP streaming capability confirmed
- ✅ Integration with existing streaming infrastructure
- ✅ GUI launches without critical errors
- ✅ Video encoders available and working
- ✅ Audio system functional

## Future Considerations

1. **Permanent PATH Configuration**
   ```bash
   echo 'export PATH=$PATH:/snap/bin' >> ~/.bashrc
   ```

2. **Auto-start Configuration**
   - Consider systemd service for automatic OBS startup
   - Useful for headless streaming setups

3. **Performance Optimization**
   - Monitor CPU usage during streaming
   - Consider hardware encoding (VAAPI/QuickSync) for better performance

4. **Security Considerations**
   - Snap packages run in confined environment
   - May need additional permissions for certain features
   - Use `snap connect` commands if needed

## Command Reference

### Quick Installation Commands
```bash
# Fix package manager
sudo apt --fix-broken install

# Install dependencies
sudo apt install ffmpeg snapd

# Enable snapd
sudo systemctl enable --now snapd.socket

# Install OBS Studio
sleep 10 && sudo snap install obs-studio

# Verify installation
snap list obs-studio
export PATH=$PATH:/snap/bin && obs-studio --version
```

### Launch Commands
```bash
# Launch OBS Studio
export PATH=$PATH:/snap/bin && obs-studio

# Launch with script
./test-obs-rtmp.sh
```

## Error Messages and Solutions

### Error: "kio6 : Depends: qt6-base-private-abi (= 6.7.2)"
**Solution**: Use Snap installation instead of APT

### Error: "obs-studio: command not found"
**Solution**: Add snap bin to PATH: `export PATH=$PATH:/snap/bin`

### Error: "too early for operation, device not yet seeded"
**Solution**: Wait for snapd to initialize: `sleep 10` before snap commands

### Warning: Library loading errors
**Solution**: These are cosmetic warnings and don't affect functionality

## Verification Checklist

- [ ] Package manager fixed with `apt --fix-broken install`
- [ ] FFmpeg installed and working
- [ ] Snapd installed and service enabled
- [ ] OBS Studio installed via snap
- [ ] PATH configured to include `/snap/bin`
- [ ] OBS Studio launches without critical errors
- [ ] RTMP configuration tested
- [ ] Streaming to localhost:1935 successful

## Conclusion

The Snap package manager proved to be the most reliable method for installing OBS Studio on Kali Linux, successfully bypassing the Qt6 dependency conflicts that prevented installation through traditional package managers. The installation is fully functional and ready for RTMP streaming to the existing streaming infrastructure.

**Key Success Factors**:
1. **Fixed package manager first** - Essential foundation
2. **Used Snap instead of APT** - Avoided dependency conflicts
3. **Proper PATH configuration** - Made snap binaries accessible
4. **Systematic troubleshooting** - Documented each failed attempt
5. **Integration testing** - Verified RTMP streaming functionality
