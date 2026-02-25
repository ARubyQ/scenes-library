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

## Русский

**Scenes Library** — мощный и удобный модуль браузера сцен для Foundry VTT, который улучшает управление сценами с помощью интуитивного интерфейса и расширенных возможностей.

### Возможности

- **Двухрежимный браузер**: Переключение между режимом "Мир" (просмотр сцен в вашем мире) и режимом "Библиотеки" (просмотр сцен в компендиумах для импорта)
- **Импорт сцен**: Импорт отдельных сцен или целых библиотек компендиумов
- **Быстрый доступ**: 
  - Система избранного для быстрого доступа к часто используемым сценам и папкам
  - Вкладка "Недавно импортированные" для отслеживания новых сцен
  - Просмотр всех сцен для полного обзора
- **Создание сцен**: Создание новых сцен напрямую из:
  - URL изображений (автоматическая загрузка в `assets/maps/autodownloaded/`)
  - Изображений из буфера обмена (вставка через Ctrl+V или кнопка вставки)
  - Файлового проводника для локальных файлов
- **Расширенный просмотр**: Переключение между миниатюрами и полными фонами для лучшей визуализации сцен
- **Умный поиск**: Поиск в реальном времени по папкам и сценам с мгновенной фильтрацией
  - Поиск по тегам с использованием синтаксиса `#тег`
  - Поиск по названию с использованием синтаксиса `$название`
  - Комбинирование нескольких тегов: `#тег1 #тег2` для поиска сцен со всеми указанными тегами
  - Автодополнение тегов в строке поиска
- **Система тегов**: Организация сцен с помощью пользовательских тегов
  - Добавление и удаление тегов у сцен
  - Переключение видимости тегов на карточках сцен
  - Автодополнение тегов в поиске и редакторе тегов
- **Режим пагинации**: Переключение между режимом прокрутки и постраничным просмотром (12 сцен на странице)
  - Навигация по страницам с помощью кнопок предыдущая/следующая
  - Работает совместно с поиском и фильтрацией
- **Управление папками**: Создание, переименование, цветовая маркировка и организация папок с поддержкой drag-and-drop
- **Визуальные индикаторы**: С первого взгляда видно, какие сцены активны, в навигации, имеют сетку, включено зрение токенов или уже импортированы
- **Оптимизировация**: Ленивая загрузка и оптимизированный рендеринг для плавного просмотра даже с большими коллекциями сцен

### Установка

Ссылка для установки: https://github.com/ARubyQ/scenes-library/releases/latest/download/module.json

### Известные проблемы

- **Имена папок в компендиумах**: Имена папок в компендиумах могут не соответствовать реальным именам и отображаются как "Folder 1", "Folder 2" и т.д. Это связано с ограничениями в доступе к данным папок компендиумов. Если вы знаете, как решить эту проблему, напишите мне в Discord @rubyq
- **Импорт папок компендиумов**: При импорте сцен из компендиумов структура папок не импортируется. Сцены импортируются в одну папку с названием компендиума, независимо от их исходной организации в компендиуме.

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

## История изменений

### Версия 1.3.0

**Система тегов:**
- Добавлена комплексная система тегов для организации сцен
- Поиск по тегам с синтаксисом `#тег`
- Поиск по названию с синтаксисом `$название`
- Поддержка поиска по нескольким тегам
- Автодополнение тегов в строке поиска и редакторе тегов
- Переключение видимости тегов на карточках сцен
- Инкрементальное кэширование тегов для производительности

**Режим пагинации:**
- Добавлен переключатель режима пагинации (12 сцен на странице)
- Навигация по страницам с кнопками предыдущая/следующая
- Интеграция с функцией поиска

### Версия 1.2.0

**Основные функции:**
- Добавлен двухрежимный браузер: переключение между режимом "Мир" (просмотр сцен в вашем мире) и режимом "Библиотеки" (просмотр сцен в компендиумах)
- Реализован функционал импорта сцен из компендиумов с автоматической организацией по папкам
- Добавлена кнопка "Импортировать всё" для импорта целых библиотек компендиумов одним кликом
- Добавлена кнопка "Импортировать и Открыть" для быстрого просмотра сцены после импорта
- Введена вкладка "Недавно импортированные" для отслеживания новых сцен с возможностью индивидуального удаления

**Улучшения создания сцен:**
- Добавлена возможность создания сцен из URL изображений с автоматической загрузкой в `assets/maps/autodownloaded/`
- Реализована поддержка изображений из буфера обмена (вставка через Ctrl+V или кнопка вставки)
- Изображения из буфера обмена сохраняются в `assets/maps/clipboard/`

**Улучшения интерфейса:**
- Исправлено выравнивание иконок в кнопках переключения режимов

**Производительность и качество:**
- Оптимизирован режим "Полное изображение" для уменьшения лагов, особенно для фонов `.webm`
- Добавлена ленивая загрузка и асинхронное декодирование для изображений
- Улучшено воспроизведение видео с предзагрузкой метаданных и управлением при наведении

**Локализация:**
- Добавлена поддержка английской локализации

**Исправления ошибок:**
- Исправлена проблема, когда сцены не исчезали из интерфейса браузера после удаления
- Исправлена проблема с загрузкой фонов `.webm`
- Улучшен диалог удаления папки с опцией удаления содержимого папки