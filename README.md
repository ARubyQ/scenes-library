# Scenes Library

![Downloads](https://img.shields.io/github/downloads/ARubyQ/scenes-library/total)

## English

**Scenes Library** is a powerful and convenient scene browser module for Foundry VTT that enhances scene management with an intuitive interface and advanced features.

### Features

- **Dual Mode Browser**: Switch between "World" mode (viewing scenes in your world) and "Compendium" mode (browsing scenes in compendium packs for import)
- **Scene Import**: Import individual scenes or entire compendium libraries
- **Quick Access**: 
  - Favorites system for quick access to frequently used scenes and folders
  - Recently Imported tab to track newly imported scenes
  - All Scenes view for comprehensive browsing
- **Scene Creation**: Create new scenes directly from:
  - Image URLs (automatic download to `assets/maps/autodownloaded/`)
  - Clipboard images (paste with Ctrl+V or use the paste button)
  - File picker for local files
- **Advanced Viewing**: Toggle between thumbnail previews and full background images for better scene visualization
- **Smart Search**: Real-time search for both folders and scenes with instant filtering
  - Search by tags using `#tag` syntax
  - Search by name using `$name` syntax
  - Combine multiple tags: `#tag1 #tag2` to find scenes with all specified tags
  - Autocomplete suggestions for tags in search bar
- **Tag System**: Organize scenes with custom tags
  - Add and remove tags from scenes
  - Toggle tag visibility on scene cards
  - Tag autocomplete in search and tag editor
- **Pagination Mode**: Switch between scroll view and paginated view (12 scenes per page)
  - Navigate through pages with previous/next buttons
  - Works seamlessly with search and filtering
- **Folder Management**: Create, rename, color-code, and organize folders with drag-and-drop support
- **Visual Indicators**: See at a glance which scenes are active, in navigation, have grids, token vision enabled, or are already imported
- **Optimized**: Lazy loading and optimized rendering for smooth browsing even with large scene collections

### Installation

Install link: https://github.com/ARubyQ/scenes-library/releases/latest/download/module.json

### Known Issues

- **Compendium Folder Names**: Folder names in compendiums may not match the actual folder names and are displayed as "Folder 1", "Folder 2", etc. This is due to limitations in how compendium folder data is accessed. If you know how to solve this problem, please contact me on Discord @rubyq
- **Compendium Folder Import**: When importing scenes from compendiums, the folder structure is not imported. Scenes are imported into a single folder named after the compendium, regardless of their original folder organization in the compendium.

---

<img width="529" height="560" alt="image" src="https://github.com/user-attachments/assets/8bc7c1d2-f9cf-439b-85d2-177052bfff5d" />

<img width="864" height="604" alt="image" src="https://github.com/user-attachments/assets/ebd045ed-7f81-469e-b124-af64f45bde6a" />


---

### Changelog

#### Version 1.3.0

**Tag System:**
- Added comprehensive tag system for scene organization
- Tag-based search with `#tag` syntax
- Name-based search with `$name` syntax
- Multiple tag search support
- Tag autocomplete in search bar and tag editor
- Toggle tag visibility on scene cards
- Incremental tag caching for performance

**Pagination Mode:**
- Added pagination mode toggle (12 scenes per page)
- Page navigation with previous/next buttons
- Seamless integration with search functionality

#### Version 1.2.0

**Major Features:**
- Added dual-mode browser: switch between "World" mode (viewing scenes in your world) and "Compendium" mode (browsing scenes in compendium packs)
- Implemented scene import functionality from compendiums with automatic folder organization
- Added "Import All" button to import entire compendium libraries at once
- Added "Import & View" button for quick scene preview after import
- Introduced "Recently Imported" tab to track newly imported scenes with individual remove options

**Scene Creation Enhancements:**
- Added ability to create scenes from image URLs with automatic download to `assets/maps/autodownloaded/`
- Implemented clipboard image support (paste with Ctrl+V or use paste button)
- Images from clipboard are saved to `assets/maps/clipboard/`

**UI Improvements:**
- Fixed icon alignment in mode-switching buttons

**Performance & Quality:**
- Optimized "Full Image" mode to reduce lag, especially for `.webm` backgrounds
- Fixed blurry `.webm` backgrounds in "Full Image" mode by removing poster attribute
- Added lazy loading and async decoding for images
- Improved video playback with metadata preloading and hover controls

**Localization:**
- Added English localization support

**Bug Fixes:**
- Fixed scenes not disappearing from browser interface after deletion
- Fixed `.webm` backgrounds not loading properly
- Improved folder deletion dialog with option to delete folder contents
