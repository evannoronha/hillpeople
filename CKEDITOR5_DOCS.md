# CKEditor 5 Features Documentation

> Complete reference documentation for CKEditor 5 features. This document was compiled from the official CKEditor 5 documentation at https://ckeditor.com/docs/ckeditor5/latest/features/

---

## Table of Contents

1. [Text Formatting](#text-formatting)
   - [Basic Text Styles](#basic-text-styles)
   - [Font Features](#font-features)
   - [Headings](#headings)
   - [Text Alignment](#text-alignment)
   - [Highlight](#highlight)
   - [Remove Format](#remove-format)
   - [Case Change](#case-change)
2. [Content Structure](#content-structure)
   - [Block Quote](#block-quote)
   - [Block Indentation](#block-indentation)
   - [Horizontal Line](#horizontal-line)
   - [Lists](#lists)
   - [To-Do Lists](#to-do-lists)
   - [Code Blocks](#code-blocks)
3. [Images](#images)
   - [Images Overview](#images-overview)
   - [Image Installation](#image-installation)
   - [Image Captions](#image-captions)
   - [Image Styles](#image-styles)
   - [Image Resizing](#image-resizing)
   - [Linking Images](#linking-images)
4. [Media and Embedding](#media-and-embedding)
   - [Media Embed](#media-embed)
   - [HTML Embed](#html-embed)
   - [General HTML Support](#general-html-support)
5. [Tables](#tables)
   - [Tables Overview](#tables-overview)
   - [Table Styling](#table-styling)
   - [Table Column Resizing](#table-column-resizing)
6. [Links and Navigation](#links-and-navigation)
   - [Links](#links)
   - [Bookmarks](#bookmarks)
7. [Productivity](#productivity)
   - [Autoformatting](#autoformatting)
   - [Autosave](#autosave)
   - [Find and Replace](#find-and-replace)
   - [Word and Character Count](#word-and-character-count)
   - [Mentions](#mentions)
   - [Special Characters](#special-characters)
   - [Emoji](#emoji)
   - [Text Transformation](#text-transformation)
   - [Format Painter](#format-painter)
   - [Slash Commands](#slash-commands)
8. [Collaboration](#collaboration)
   - [Collaboration Overview](#collaboration-overview)
   - [Track Changes](#track-changes)
   - [Comments](#comments)
   - [Revision History](#revision-history)
9. [Document Conversion](#document-conversion)
   - [Export to PDF](#export-to-pdf)
   - [Export to Word](#export-to-word)
   - [Import from Word](#import-from-word)
   - [Paste from Office](#paste-from-office)
   - [Markdown Output](#markdown-output)
10. [Editor Features](#editor-features)
    - [Source Code Editing](#source-code-editing)
    - [Read-Only Mode](#read-only-mode)
    - [Restricted Editing](#restricted-editing)
    - [Undo/Redo](#undoredo)
    - [Select All](#select-all)
    - [Show Blocks](#show-blocks)
    - [Drag and Drop](#drag-and-drop)
11. [Document Features](#document-features)
    - [Document Title](#document-title)
    - [Page Break](#page-break)
12. [Accessibility and Language](#accessibility-and-language)
    - [Accessibility Support](#accessibility-support)
    - [Text Part Language](#text-part-language)
13. [AI Features](#ai-features)
    - [AI Assistant](#ai-assistant-legacy)
14. [Utilities](#utilities)
    - [Watchdog](#watchdog)
    - [Spelling and Grammar Checking](#spelling-and-grammar-checking)

---

# Text Formatting

## Basic Text Styles

The basic styles feature in CKEditor 5 provides essential text formatting capabilities that form the foundation of most WYSIWYG editors.

### Available Text Styles

| Style | Command | Toolbar Item | HTML Output |
|-------|---------|--------------|-------------|
| Bold | `'bold'` | `'bold'` | `<strong>bold</strong>` |
| Italic | `'italic'` | `'italic'` | `<i>italic</i>` |
| Underline | `'underline'` | `'underline'` | `<u>underline</u>` |
| Strikethrough | `'strikethrough'` | `'strikethrough'` | `<s>strikethrough</s>` |
| Code | `'code'` | `'code'` | `<code>code</code>` |
| Subscript | `'subscript'` | `'subscript'` | `<sub>subscript</sub>` |
| Superscript | `'superscript'` | `'superscript'` | `<sup>superscript</sup>` |

### Usage Methods

Users can apply formatting through multiple approaches:

- **Toolbar buttons** – Visual interface for applying styles
- **Keyboard shortcuts and Markdown**:
  - Bold: `**text**` or `__text__`
  - Italic: `*text*` or `_text_`
  - Code: `` `text` ``
  - Strikethrough: `~~text~~`

### Supported Input Elements

Each feature accepts multiple HTML element types during paste, load, or data API operations:

- **Bold**: `<strong>`, `<b>`, elements with `font-weight: bold` (≥600)
- **Italic**: `<i>`, `<em>`, elements with `font-style: italic`
- **Underline**: `<u>`, elements with `text-decoration: underline`
- **Strikethrough**: `<s>`, `<del>`, `<strike>`, elements with `text-decoration: line-through`
- **Code**: `<code>`, elements with `word-wrap: break-word`
- **Subscript**: `<sub>`, elements with `vertical-align: sub`
- **Superscript**: `<sup>`, elements with `vertical-align: super`

### Installation

```javascript
import { ClassicEditor, Bold, Code, Italic, Strikethrough, Subscript, Superscript, Underline } from 'ckeditor5';

ClassicEditor
  .create( document.querySelector( '#editor' ), {
    licenseKey: '<YOUR_LICENSE_KEY>',
    plugins: [ Bold, Code, Italic, Strikethrough, Subscript, Superscript, Underline ],
    toolbar: {
      items: [ 'bold', 'italic', 'underline', 'strikethrough', 'code', 'subscript', 'superscript' ]
    }
  } )
  .then( /* ... */ )
  .catch( /* ... */ );
```

### API Usage

Execute formatting commands programmatically:

```javascript
editor.execute( 'bold' );
```

---

## Font Features

The font feature enables users to modify font family, size, and color (including background color) within CKEditor 5.

### Feature Components

- **FontFamily**: Apply inline `<span>` elements with `font-family` styling
- **FontSize**: Control sizing via CSS classes or `font-size` style attributes
- **FontColor**: Manage text color through inline styling
- **FontBackgroundColor**: Apply background color to text selections

### Installation

```javascript
import { ClassicEditor, Font } from 'ckeditor5';

ClassicEditor
  .create( document.querySelector( '#editor' ), {
    licenseKey: '<YOUR_LICENSE_KEY>',
    plugins: [ Font ],
    toolbar: [ 'fontSize', 'fontFamily', 'fontColor', 'fontBackgroundColor' ],
    fontFamily: { /* Configuration */ },
    fontColor: { /* Configuration */ }
  } )
```

### Font Family Configuration

```javascript
fontFamily: {
  options: [
    'default',
    'Ubuntu, Arial, sans-serif',
    'Ubuntu Mono, Courier New, Courier, monospace'
  ],
  supportAllValues: true
}
```

### Font Size Configuration

#### Predefined Size Presets
- `'tiny'` (0.7em)
- `'small'` (0.85em)
- `'big'` (1.4em)
- `'huge'` (1.8em)

```javascript
fontSize: {
  options: [ 'tiny', 'default', 'big' ]
}
```

#### Numerical Font Sizes

```javascript
fontSize: {
  options: [ 9, 11, 13, 'default', 17, 19, 21 ]
}
```

### Font Color Configuration

```javascript
fontColor: {
  colors: [
    { color: 'hsl(0, 0%, 0%)', label: 'Black' },
    { color: 'hsl(0, 0%, 30%)', label: 'Dim grey' },
    { color: 'hsl(0, 0%, 100%)', label: 'White', hasBorder: true }
  ],
  columns: 3,
  documentColors: 12,
  colorPicker: {
    format: 'hex'  // Output format: 'hex', 'hsl', 'rgb'
  }
}
```

### API Reference

```javascript
// Change font family
editor.execute( 'fontFamily', { value: 'Arial' } );

// Change font size
editor.execute( 'fontSize', { value: 10 } );

// Change font color
editor.execute( 'fontColor', { value: 'rgb(30, 188, 97)' } );

// Change background color
editor.execute( 'fontBackgroundColor', { value: 'rgb(30, 188, 97)' } );
```

---

## Headings

The heading feature enables document structure through heading elements (H1-H6), improving readability for users and search engine indexing.

### Default Heading Levels

By default, the editor supports `<h2>`, `<h3>`, and `<h4>` elements. The feature reserves `<h1>` for the document title (via the Title plugin).

### Installation

```javascript
import { ClassicEditor, Heading } from 'ckeditor5';

ClassicEditor
  .create(document.querySelector('#editor'), {
    licenseKey: '<YOUR_LICENSE_KEY>',
    plugins: [Heading],
    toolbar: ['heading']
  })
```

### Configuration

```javascript
heading: {
  options: [
    { model: 'paragraph', title: 'Paragraph', class: 'ck-heading_paragraph' },
    { model: 'heading1', view: 'h1', title: 'Heading 1', class: 'ck-heading_heading1' },
    { model: 'heading2', view: 'h2', title: 'Heading 2', class: 'ck-heading_heading2' },
    { model: 'heading3', view: 'h3', title: 'Heading 3', class: 'ck-heading_heading3' }
  ]
}
```

### Custom Heading Elements

```javascript
heading: {
  options: [
    {
      model: 'headingFancy',
      view: { name: 'h2', classes: 'fancy' },
      title: 'Heading 2 (fancy)',
      class: 'ck-heading_heading2_fancy',
      converterPriority: 'high'
    }
  ]
}
```

### API Usage

```javascript
editor.execute('heading', { value: 'heading2' });
```

---

## Text Alignment

The text alignment feature enables content positioning adjustments (left, right, center, justify).

### Installation

```javascript
import { ClassicEditor, Alignment } from 'ckeditor5';

ClassicEditor.create( document.querySelector( '#editor' ), {
  licenseKey: '<YOUR_LICENSE_KEY>',
  plugins: [ Alignment ],
  toolbar: [ 'alignment' ],
  alignment: {
    options: [ 'left', 'right', 'center', 'justify' ]
  }
})
```

### CSS Class-Based Alignment

```javascript
alignment: {
  options: [
    { name: 'left', className: 'my-align-left' },
    { name: 'right', className: 'my-align-right' },
    { name: 'center', className: 'my-align-center' },
    { name: 'justify', className: 'my-align-justify' }
  ]
}
```

### Toolbar Button Styles

Individual buttons: `'alignment:left'`, `'alignment:right'`, `'alignment:center'`, `'alignment:justify'`

### API Usage

```javascript
editor.execute( 'alignment', { value: 'center' } );
```

---

## Highlight

The Highlight feature enables marking text fragments with different colors, functioning both as a marker (background color) and as a pen (text color).

### Installation

```javascript
import { ClassicEditor, Highlight } from 'ckeditor5';

ClassicEditor
  .create( document.querySelector( '#editor' ), {
    licenseKey: '<YOUR_LICENSE_KEY>',
    plugins: [ Highlight ],
    toolbar: [ 'highlight' ],
    highlight: {
      options: [
        {
          model: 'greenMarker',
          class: 'marker-green',
          title: 'Green marker',
          color: 'var(--ck-content-highlight-marker-green)',
          type: 'marker'
        },
        {
          model: 'redPen',
          class: 'pen-red',
          title: 'Red pen',
          color: 'var(--ck-content-highlight-pen-red)',
          type: 'pen'
        }
      ]
    }
  } )
```

### Default Options

- **yellowMarker** – Yellow background marker
- **greenMarker** – Green background marker
- **pinkMarker** – Pink background marker
- **blueMarker** – Blue background marker
- **redPen** – Red text pen
- **greenPen** – Green text pen

### API Usage

```javascript
editor.execute( 'highlight', { value: 'yellowMarker' } );
// Remove highlighting
editor.execute( 'highlight' );
```

---

## Remove Format

The remove format feature enables quick removal of inline HTML elements and CSS styling applied to text.

### What It Removes

- Basic text styles (bold, italic, underline, strikethrough)
- Code formatting
- Subscript and superscript
- Font size and family
- Text alignment

### What It Preserves

- Block-level formatting (headings, images)
- Links and semantic data
- Non-formatting content

### Installation

```javascript
import { ClassicEditor, RemoveFormat } from 'ckeditor5';

ClassicEditor
  .create( document.querySelector( '#editor' ), {
    licenseKey: '<YOUR_LICENSE_KEY>',
    plugins: [ RemoveFormat ],
    toolbar: [ 'removeFormat' ]
  } )
```

### Extending to Custom Content

```javascript
function RemoveFormatLinks( editor ) {
  editor.model.schema.setAttributeProperties( 'linkHref', {
    isFormatting: true
  } );
}
```

### API Usage

```javascript
editor.execute( 'removeFormat' );
```

---

## Case Change

The case change feature enables rapid modification of letter case in selected content.

### Case Conversion Options

- Uppercase transformation
- Lowercase transformation
- Title case formatting

### Keyboard Shortcut

**Shift+F3** cycles through case formats: UPPERCASE → lowercase → Title Case

### Installation

```javascript
const { ClassicEditor } = CKEDITOR;
const { CaseChange } = CKEDITOR_PREMIUM_FEATURES;

ClassicEditor
  .create( document.querySelector( '#editor' ), {
    licenseKey: '<YOUR_LICENSE_KEY>',
    plugins: [ CaseChange ],
    toolbar: [ 'caseChange' ],
  } )
```

### Title Case Configuration

```javascript
caseChange: {
  titleCase: {
    excludeWords: [ 'a', 'an', 'and', 'as', 'at', 'but', 'by', 'for',
      'if', 'in', 'nor', 'of', 'on', 'or', 'the', 'to', 'via' ]
  }
}
```

### API Usage

```javascript
editor.execute( 'changeCaseUpper' );
editor.execute( 'changeCaseLower' );
editor.execute( 'changeCaseTitle' );
```

---

# Content Structure

## Block Quote

The block quote feature enables users to insert block quotations and pull quotes into their content.

### Installation

```javascript
import { ClassicEditor, BlockQuote } from 'ckeditor5';

ClassicEditor
  .create( document.querySelector( '#editor' ), {
    licenseKey: '<YOUR_LICENSE_KEY>',
    plugins: [ BlockQuote ],
    toolbar: [ 'blockQuote' ]
  } )
```

### Nested Block Quotes

Starting from version 27.1.0, CKEditor 5 properly displays a block quote nested in another block quote.

### Disallow Nesting Block Quotes

```javascript
function DisallowNestingBlockQuotes( editor ) {
  editor.model.schema.addChildCheck( ( context, childDefinition ) => {
    if ( context.endsWith( 'blockQuote' ) &&
         childDefinition.name == 'blockQuote' ) {
      return false;
    }
  } );
}
```

### API Usage

```javascript
editor.execute( 'blockQuote' );
```

---

## Block Indentation

The block indentation feature enables you to adjust indentation levels for text blocks such as paragraphs, headings, and lists.

### Installation

```javascript
import { ClassicEditor, Indent, IndentBlock } from 'ckeditor5';

ClassicEditor
  .create( document.querySelector( '#editor' ), {
    plugins: [ Indent, IndentBlock ],
    toolbar: [ 'indent', 'outdent' ]
  } )
```

### Configuration - Offset and Unit

```javascript
indentBlock: {
  offset: 1,
  unit: 'em'
}
```

### Configuration - CSS Classes

```javascript
indentBlock: {
  classes: [
    'custom-block-indent-a',
    'custom-block-indent-b',
    'custom-block-indent-c'
  ]
}
```

### API Usage

```javascript
editor.execute('indentBlock');
editor.execute('outdentBlock');
```

---

## Horizontal Line

The horizontal line feature enables users to insert visual dividers that separate content sections.

### Installation

```javascript
import { ClassicEditor, HorizontalLine } from 'ckeditor5';

ClassicEditor
  .create( document.querySelector( '#editor' ), {
    licenseKey: '<YOUR_LICENSE_KEY>',
    plugins: [ HorizontalLine ],
    toolbar: [ 'horizontalLine' ],
  } )
```

### Autoformatting Support

Typing `---` automatically converts to a horizontal line.

### API Usage

```javascript
editor.execute( 'horizontalLine' );
```

---

## Lists

The list feature enables creation of ordered (numbered) and unordered (bulleted) lists in CKEditor 5.

### Installation

```javascript
import { ClassicEditor, List } from 'ckeditor5';

ClassicEditor
  .create(document.querySelector('#editor'), {
    licenseKey: '<YOUR_LICENSE_KEY>',
    plugins: [List],
    toolbar: ['bulletedList', 'numberedList']
  })
```

### List Properties (Advanced Styling)

```javascript
import { ClassicEditor, List, ListProperties } from 'ckeditor5';

ClassicEditor
  .create(document.querySelector('#editor'), {
    plugins: [List, ListProperties],
    toolbar: ['bulletedList', 'numberedList'],
    list: {
      properties: {
        styles: true,
        startIndex: true,
        reversed: true
      }
    }
  })
```

### Markdown Shortcuts

- Bulleted lists: Start lines with `*` or `-` followed by space
- Numbered lists: Start lines with `1.` or `1)` followed by space

### API Reference

```javascript
// Create/toggle lists
editor.execute('numberedList');
editor.execute('bulletedList');

// Indent/outdent
editor.execute('indentList');
editor.execute('outdentList');

// Set marker type
editor.execute('listStyle', { type: 'lower-roman' });

// Set starting number
editor.execute('listStart', { startIndex: 3 });

// Reverse list order
editor.execute('listReversed', { reversed: true });
```

---

## To-Do Lists

The to-do list functionality enables users to create interactive checkbox-based lists with labels.

### Installation

```javascript
import { ClassicEditor, TodoList } from 'ckeditor5';

ClassicEditor.create( document.querySelector( '#editor' ), {
  licenseKey: '<YOUR_LICENSE_KEY>',
  plugins: [ TodoList ],
  toolbar: [ 'todoList' ]
})
```

### Keyboard Shortcuts

Toggle checkbox states using **Ctrl + Enter** (Windows/Linux) or **Cmd + Enter** (Mac).

### Autoformatting

Start lines with `[ ]` for unchecked or `[x]` for checked items, followed by a space.

### API Reference

```javascript
editor.execute('todoList');
editor.execute('checkTodoList');
```

---

## Code Blocks

The code block feature enables insertion and editing of pre-formatted code sections.

### Installation

```javascript
import { ClassicEditor, CodeBlock } from 'ckeditor5';

ClassicEditor
  .create( document.querySelector( '#editor' ), {
    licenseKey: '<YOUR_LICENSE_KEY>',
    plugins: [ CodeBlock ],
    toolbar: [ 'codeBlock' ],
    codeBlock: {
      languages: [
        { language: 'css', label: 'CSS' },
        { language: 'html', label: 'HTML' },
        { language: 'javascript', label: 'JavaScript' },
        { language: 'python', label: 'Python' }
      ]
    }
  } )
```

### Custom CSS Classes

```javascript
codeBlock: {
  languages: [
    { language: 'plaintext', label: 'Plain text', class: '' },
    { language: 'php', label: 'PHP', class: 'php-code' },
    { language: 'javascript', label: 'JavaScript', class: 'js javascript js-code' }
  ]
}
```

### Indentation Settings

```javascript
codeBlock: {
  indentSequence: '    ' // Four spaces instead of tab
}
```

### API Usage

```javascript
editor.execute( 'codeBlock', { language: 'css' } );
```

---

# Images

## Images Overview

CKEditor 5 provides comprehensive image handling capabilities including insertion, uploading, resizing, styling, captioning, and linking.

### Core Architecture

The `@ckeditor/ckeditor5-image` package bundles multiple complementary plugins:

- **Image Captions**: Descriptive text overlay functionality
- **Image Styles**: Predefined styling options
- **Text Alternatives**: Accessibility and SEO enhancement
- **Image Resizing**: User-controlled dimension adjustment
- **Image Linking**: URL anchor functionality
- **Upload Methods**: Multiple insertion approaches
- **Responsive Images**: Viewport-adaptive display

### Contextual Image Toolbar

```javascript
ClassicEditor.create(document.querySelector('#editor'), {
  image: {
    toolbar: ['toggleImageCaption', 'imageTextAlternative', 'ckboxImageEdit']
  }
})
```

---

## Image Installation

### Basic Installation

```javascript
import {
  ClassicEditor,
  Image,
  ImageCaption,
  ImageResize,
  ImageStyle,
  ImageToolbar,
  LinkImage
} from 'ckeditor5';

ClassicEditor
  .create( document.querySelector( '#editor' ), {
    licenseKey: '<YOUR_LICENSE_KEY>',
    plugins: [ Image, ImageToolbar, ImageCaption, ImageStyle, ImageResize, LinkImage ],
    toolbar: [ 'insertImage' ],
    image: {
      toolbar: [
        'imageStyle:block',
        'imageStyle:side',
        '|',
        'toggleImageCaption',
        'imageTextAlternative',
        '|',
        'linkImage'
      ],
      insert: {
        type: 'auto',
        integrations: [ 'upload', 'assetManager', 'url' ]
      }
    }
  } )
```

### Inline vs. Block Images

| Plugin | Block Images | Inline Images |
|--------|:---:|:---:|
| `Image` (default) | ✅ | ✅ |
| `ImageBlock` | ✅ | ❌ |
| `ImageInline` | ❌ | ✅ |

---

## Image Captions

The `ImageCaption` plugin enables adding descriptive text below images using the `<figcaption>` HTML element.

### HTML Structure

```html
<figure class="image">
  <img src="..." alt="...">
  <figcaption>A caption goes here...</figcaption>
</figure>
```

### API Components

- **UI Button**: `'toggleImageCaption'`
- **Command**: `'toggleImageCaption'`

---

## Image Styles

The image styles feature allows users to adjust image appearance through CSS classes or changing image type from inline to block.

### Default Available Styles

| Style | Type Conversion | CSS Class |
|-------|-----------------|-----------|
| block | converts to block | removes classes |
| inline | converts to inline | removes classes |
| side | converts to block | image-style-side |
| alignLeft | none | image-style-align-left |
| alignRight | none | image-style-align-right |
| alignCenter | block | image-style-align-center |

### API Usage

```javascript
editor.execute('imageStyle', {value: 'side'});
```

---

## Image Resizing

The image resize feature enables users to adjust image widths using handles, dropdowns, or standalone buttons.

### Installation

```javascript
import { ClassicEditor, Image, ImageResize } from 'ckeditor5';

ClassicEditor.create(document.querySelector('#editor'), {
  plugins: [Image, ImageResize]
})
```

### Markup Structure

```html
<figure class="image image_resized" style="width: 75%;">
  <img src="..." alt="...">
</figure>
```

### Unit Options

```javascript
// Percentage (default, responsive)
config.image.resizeUnit: '%'

// Pixel-based (fixed dimensions)
config.image.resizeUnit: 'px'
```

---

## Linking Images

The `LinkImage` plugin enables users to attach hyperlinks to images.

### HTML Structure

**Block-level linked images:**
```html
<figure class="image">
  <a href="...">
    <img src="..." alt="...">
  </a>
  <figcaption>Image caption</figcaption>
</figure>
```

**Inline linked images:**
```html
<a href="...">
  Some text <img src="..." alt="..." style="width: 20px">
</a>
```

### API Components

- **Toolbar button**: `'linkImage'`
- **Command**: `'linkImage'`

---

# Media and Embedding

## Media Embed

The media embed feature enables users to insert embeddable media such as YouTube or Vimeo videos and tweets.

### Installation

```javascript
import { ClassicEditor, MediaEmbed } from 'ckeditor5';

ClassicEditor
  .create( document.querySelector( '#editor' ), {
    licenseKey: '<YOUR_LICENSE_KEY>',
    plugins: [ MediaEmbed ],
    toolbar: [ 'mediaEmbed' ],
    mediaEmbed: {
      previewsInData: true
    }
  } )
```

### Previewable Media

- YouTube videos
- Vimeo videos
- Dailymotion videos
- Spotify widgets

### Non-Previewable Media

- Twitter/X posts
- Instagram photos
- Facebook posts
- Google Maps
- Flickr images

### Configuration

```javascript
mediaEmbed: {
  elementName: 'o-embed',
  previewsInData: true,
  extraProviders: [
    {
      name: 'customProvider',
      url: /^example\.com\/media\/(\w+)/
    }
  ],
  removeProviders: [ 'instagram', 'twitter', 'googleMaps' ]
}
```

### API Usage

```javascript
editor.execute( 'mediaEmbed', 'http://url.to.the/media' );
```

---

## HTML Embed

The HTML embed feature enables users to insert arbitrary HTML code snippets directly into editor content.

### Installation

```javascript
import { ClassicEditor, HtmlEmbed } from 'ckeditor5';

ClassicEditor.create(document.querySelector('#editor'), {
  plugins: [HtmlEmbed],
  toolbar: ['htmlEmbed'],
  htmlEmbed: {
    showPreviews: true,
    sanitizeHtml: (inputHtml) => {
      // Use DOMPurify or similar
      return { html: sanitizedHtml, hasChanged: true };
    }
  }
})
```

### Security Considerations

Always implement `sanitizeHtml` configuration and Content Security Policy (CSP) headers to prevent XSS attacks.

### API Usage

```javascript
editor.execute('htmlEmbed');
editor.execute('htmlEmbed', '<b>Content</b>');
```

---

## General HTML Support

The General HTML Support (GHS) feature enables developers to incorporate HTML elements, attributes, classes, and styles that lack dedicated CKEditor 5 plugins.

### Installation

```javascript
import { ClassicEditor, GeneralHtmlSupport } from 'ckeditor5';

ClassicEditor.create(document.querySelector('#editor'), {
  licenseKey: 'YOUR_LICENSE_KEY',
  plugins: [GeneralHtmlSupport],
  htmlSupport: {
    allow: [
      { name: 'div' },
      { name: /^(div|section|article)$/ },
      { name: 'div', classes: ['foo', 'bar'] },
      { name: 'div', attributes: { 'data-foo': true } }
    ],
    disallow: [
      { name: 'script' }
    ]
  }
});
```

### Enabling All HTML Features

```javascript
htmlSupport: {
  allow: [{
    name: /.*/,
    attributes: true,
    classes: true,
    styles: true
  }]
}
```

**Warning:** This creates significant security vulnerabilities without proper `disallow` rules.

---

# Tables

## Tables Overview

CKEditor 5's table feature enables creation and editing of tables for organizing data and structuring content.

### Installation

```javascript
import { ClassicEditor, Table, TableToolbar } from 'ckeditor5';

ClassicEditor
  .create( document.querySelector( '#editor' ), {
    licenseKey: '<YOUR_LICENSE_KEY>',
    plugins: [ Table, TableToolbar ],
    toolbar: [ 'insertTable' ],
    table: {
      contentToolbar: [ 'tableColumn', 'tableRow', 'mergeTableCells' ],
      defaultHeadings: { rows: 1, columns: 1 }
    }
  } )
```

### Key Capabilities

- Insert and modify tables
- Column and row management
- Cell merging and splitting
- Table selection of rectangular fragments
- Nesting tables within cells

### Editor Commands

| Command | Purpose |
|---------|---------|
| `'insertTable'` | Insert new table |
| `'insertTableColumnLeft'` | Add column left |
| `'insertTableColumnRight'` | Add column right |
| `'insertTableRowAbove'` | Add row above |
| `'insertTableRowBelow'` | Add row below |
| `'removeTableColumn'` | Delete column |
| `'removeTableRow'` | Delete row |
| `'mergeTableCellRight'` | Merge cell right |
| `'mergeTableCellDown'` | Merge cell down |
| `'splitTableCellVertically'` | Split cell vertically |
| `'splitTableCellHorizontally'` | Split cell horizontally |

---

## Table Styling

CKEditor 5 includes comprehensive tools for styling tables and individual cells.

### Installation

```javascript
import { ClassicEditor, Table, TableCellProperties, TableProperties,
         TableToolbar } from 'ckeditor5';

ClassicEditor
  .create(document.querySelector('#editor'), {
    plugins: [Table, TableToolbar, TableProperties, TableCellProperties],
    toolbar: ['insertTable'],
    table: {
      contentToolbar: [
        'tableColumn', 'tableRow', 'mergeTableCells',
        'tableProperties', 'tableCellProperties'
      ]
    }
  })
```

### Color Palette Configuration

```javascript
const customColorPalette = [
  { color: 'hsl(4, 90%, 58%)', label: 'Red' },
  { color: 'hsl(340, 82%, 52%)', label: 'Pink' },
  { color: 'hsl(291, 64%, 42%)', label: 'Purple' }
];

table: {
  tableProperties: {
    borderColors: customColorPalette,
    backgroundColors: customColorPalette
  },
  tableCellProperties: {
    borderColors: customColorPalette,
    backgroundColors: customColorPalette
  }
}
```

### Default Styles Configuration

```javascript
table: {
  tableProperties: {
    defaultProperties: {
      borderStyle: 'dashed',
      borderColor: 'hsl(90, 75%, 60%)',
      borderWidth: '3px',
      alignment: 'left',
      width: '550px',
      height: '450px'
    }
  },
  tableCellProperties: {
    defaultProperties: {
      horizontalAlignment: 'center',
      verticalAlignment: 'bottom',
      padding: '10px'
    }
  }
}
```

---

## Table Column Resizing

The `TableColumnResize` plugin enables users to dynamically adjust table and individual column widths.

### Installation

```javascript
import { ClassicEditor, Table, TableColumnResize } from 'ckeditor5';

ClassicEditor.create(document.querySelector('#editor'), {
  licenseKey: '<YOUR_LICENSE_KEY>',
  plugins: [Table, TableColumnResize],
  toolbar: ['insertTable']
})
```

---

# Links and Navigation

## Links

The link feature enables insertion of hyperlinks into content with a dedicated UI for creation and editing.

### Installation

```javascript
import { ClassicEditor, AutoLink, Link } from 'ckeditor5';

ClassicEditor
  .create( document.querySelector( '#editor' ), {
    licenseKey: '<YOUR_LICENSE_KEY>',
    plugins: [ Link, AutoLink ],
    toolbar: [ 'link' ],
    link: {
      defaultProtocol: 'http://',
      addTargetToExternalLinks: true,
      decorators: {
        openInNewTab: {
          mode: 'manual',
          label: 'Open in a new tab',
          attributes: {
            target: '_blank',
            rel: 'noopener noreferrer'
          }
        }
      }
    }
  } )
```

### Toolbar Configuration

```javascript
link: {
  toolbar: [ 'linkPreview', '|', 'editLink', 'linkProperties', 'unlink' ]
}
```

### Custom Protocols

```javascript
link: {
  allowedProtocols: [ 'https?', 'tel', 'sms', 'sftp', 'smb', 'slack' ]
}
```

### Automatic Decorators

```javascript
link: {
  decorators: {
    detectDownloadable: {
      mode: 'automatic',
      callback: url => url.endsWith( '.pdf' ),
      attributes: {
        download: 'file.pdf'
      }
    }
  }
}
```

### API Usage

```javascript
// Apply link
editor.execute( 'link', 'http://example.com' );

// With decorator states
editor.execute( 'link', 'http://example.com', { linkIsExternal: true } );

// Remove link
editor.execute( 'unlink' );
```

---

## Bookmarks

The bookmarks feature enables users to add and manage bookmark anchors within editor content.

### Installation

```javascript
import { ClassicEditor, Bookmark } from 'ckeditor5';

ClassicEditor
  .create( document.querySelector( '#editor' ), {
    plugins: [ Bookmark ],
    toolbar: [ 'bookmark' ],
    bookmark: {
      enableNonEmptyAnchorConversion: true
    }
  } )
```

### API Commands

- `'insertBookmark'` – Insert bookmark
- `'updateBookmark'` – Update bookmark

---

# Productivity

## Autoformatting

The autoformat feature enables rapid content formatting using Markdown-like shortcodes.

### Block Formatting

| Format | Syntax | Result |
|--------|--------|--------|
| Bulleted List | `*` or `-` + space | Creates unordered list |
| Numbered List | `1.` or `1)` + space | Creates ordered list |
| To-do List | `[ ]` or `[x]` + space | Creates checkbox items |
| Headings | `#`, `##`, `###` + space | Creates heading levels |
| Block Quote | `>` + space | Creates quoted text |
| Code Block | `` ` `` backticks | Creates code section |
| Horizontal Line | `---` | Inserts divider |

### Inline Formatting

- **Bold**: `**text**` or `__text__`
- **Italic**: `*text*` or `_text_`
- **Code**: `` `text` ``
- **Strikethrough**: `~~text~~`

### Installation

```javascript
import { ClassicEditor, Autoformat } from 'ckeditor5';

ClassicEditor.create(document.querySelector('#editor'), {
  licenseKey: '<YOUR_LICENSE_KEY>',
  plugins: [Autoformat]
})
```

---

## Autosave

The autosave capability enables automatic data preservation based on content modifications.

### Installation

```javascript
import { ClassicEditor, Autosave } from 'ckeditor5';

ClassicEditor.create(document.querySelector('#editor'), {
  licenseKey: '<YOUR_LICENSE_KEY>',
  plugins: [Autosave],
  autosave: {
    waitingTime: 5000,
    save(editor) {
      return saveData(editor.getData());
    }
  }
})
```

### Configuration

- **waitingTime** (default: 1000ms) – Minimum interval between saves
- **save** – Callback function for save operations

---

## Find and Replace

The find and replace functionality enables users to locate and substitute text throughout a document.

### Installation

```javascript
import { ClassicEditor, FindAndReplace } from 'ckeditor5';

ClassicEditor.create( document.querySelector( '#editor' ), {
  licenseKey: '<YOUR_LICENSE_KEY>',
  plugins: [ FindAndReplace ],
  toolbar: [ 'findAndReplace' ],
  findAndReplace: {
    uiType: 'dialog' // or 'dropdown'
  }
})
```

### Keyboard Shortcut

**Ctrl/Cmd+F** opens the search interface.

### Available Commands

```javascript
editor.execute( 'find', 'searchterm' );
editor.execute( 'findNext' );
editor.execute( 'findPrevious' );
editor.execute( 'replace', 'oldtext', 'newtext' );
editor.execute( 'replaceAll', 'oldtext', 'newtext' );
```

---

## Word and Character Count

The word count feature enables tracking of word and character statistics within the editor.

### Installation

```javascript
import { ClassicEditor, WordCount } from 'ckeditor5';

ClassicEditor
  .create( document.querySelector( '#editor' ), {
    licenseKey: '<YOUR_LICENSE_KEY>',
    plugins: [ WordCount ],
    wordCount: {
      displayWords: true,
      displayCharacters: true,
      onUpdate: stats => {
        console.log( `Characters: ${ stats.characters }\nWords: ${ stats.words }` );
      }
    }
  } );
```

### API Properties

```javascript
const wordCountPlugin = editor.plugins.get( 'WordCount' );

// Get container element
wordCountPlugin.wordCountContainer;

// Get precise counts
wordCountPlugin.characters;
wordCountPlugin.words;

// Listen for updates
wordCountPlugin.on( 'update', ( evt, stats ) => {
  console.log( stats.characters, stats.words );
} );
```

---

## Mentions

The mentions feature enables smart autocompletion triggered by pre-configured markers (like `@` or `#`).

### Installation

```javascript
import { ClassicEditor, Mention } from 'ckeditor5';

ClassicEditor.create(document.querySelector('#editor'), {
  licenseKey: '<YOUR_LICENSE_KEY>',
  plugins: [Mention],
  mention: {
    feeds: [{
      marker: '@',
      feed: ['@Barney', '@Lily', '@Marshall', '@Robin', '@Ted'],
      minimumCharacters: 1
    }]
  }
})
```

### Callback Feed

```javascript
mention: {
  feeds: [{
    marker: '@',
    feed: (queryText) => {
      return new Promise(resolve => {
        const filtered = items.filter(item =>
          item.name.toLowerCase().includes(queryText.toLowerCase())
        );
        resolve(filtered.slice(0, 10));
      });
    }
  }]
}
```

### Custom Item Renderer

```javascript
function customItemRenderer(item) {
  const element = document.createElement('span');
  element.textContent = `${item.name} ${item.id}`;
  return element;
}
```

### API Usage

```javascript
editor.execute('mention', {marker: '@', mention: '@John'});
```

---

## Special Characters

The Special Characters feature enables users to insert mathematical operators, currency symbols, punctuation, and Unicode letters.

### Installation

```javascript
import { ClassicEditor, SpecialCharacters, SpecialCharactersEssentials } from 'ckeditor5';

ClassicEditor.create(document.querySelector('#editor'), {
  plugins: [SpecialCharacters, SpecialCharactersEssentials],
  toolbar: ['specialCharacters'],
  specialCharacters: {
    order: ['Text', 'Latin', 'Mathematical', 'Currency', 'Arrows']
  }
})
```

### Adding Custom Categories

```javascript
function SpecialCharactersEmoji(editor) {
  editor.plugins.get('SpecialCharacters').addItems('Emoji', [
    { title: 'smiley face', character: '😊' },
    { title: 'rocket', character: '🚀' }
  ], { label: 'Emoticons' });
}
```

---

## Emoji

The emoji feature enables users to insert emojis into documents through the editor toolbar or while composing content.

### Installation

```javascript
import { ClassicEditor, Emoji, Mention } from 'ckeditor5';

ClassicEditor.create(document.querySelector('#editor'), {
  licenseKey: '<YOUR_LICENSE_KEY>',
  plugins: [Emoji, Mention],
  toolbar: ['emoji'],
  emoji: {
    dropdownLimit: 5,
    skinTone: 'medium',
    version: 16
  }
})
```

### Usage

- **Toolbar Button**: Click the emoji icon to access the panel
- **Mention-Style Trigger**: Type `:` followed by at least two letters

---

## Text Transformation

The text transformation feature provides autocorrection capabilities, automatically converting predefined text fragments into improved typographic forms.

### Default Transformations

| Input | Output |
|-------|--------|
| `(tm)` | ™ |
| `1/2` | ½ |
| `->` | → |
| `--` | – |
| `"foo"` | "foo" |

### Installation

```javascript
import { ClassicEditor, TextTransformation } from 'ckeditor5';

ClassicEditor
  .create( document.querySelector( '#editor' ), {
    licenseKey: '<YOUR_LICENSE_KEY>',
    plugins: [ TextTransformation ],
    typing: {
      transformations: {
        remove: [ 'symbols', 'quotes' ],
        extra: [
          { from: ':)', to: '🙂' },
          { from: ':+1:', to: '👍' }
        ]
      }
    }
  } )
```

---

## Format Painter

The format painter feature enables users to copy text formatting and apply it elsewhere in a document.

### Installation

```javascript
import { ClassicEditor } from 'ckeditor5';
import { FormatPainter } from 'ckeditor5-premium-features';

ClassicEditor.create(document.querySelector('#editor'), {
  licenseKey: '<YOUR_LICENSE_KEY>',
  plugins: [FormatPainter],
  toolbar: ['formatPainter']
})
```

### API Usage

```javascript
editor.execute('copyFormat');
editor.execute('pasteFormat');

// Access copied formatting
console.log(editor.commands.get('copyFormat').value);
```

---

## Slash Commands

The slash commands feature enables users to execute predefined commands by typing a forward slash (`/`) in the editor.

### Installation

```javascript
import { ClassicEditor, Mention } from 'ckeditor5';
import { SlashCommand } from 'ckeditor5-premium-features';

ClassicEditor.create(document.querySelector('#editor'), {
  licenseKey: '<YOUR_LICENSE_KEY>',
  plugins: [SlashCommand, Mention],
  slashCommand: {
    dropdownLimit: 10,
    removeCommands: ['someCommand']
  }
})
```

### Adding Commands

```javascript
slashCommand: {
  commands: [
    { id: 'bold', title: 'Bold', commandName: 'bold' },
    {
      id: 'customAction',
      title: 'Custom Action',
      execute: (editor) => { /* custom logic */ }
    }
  ]
}
```

---

# Collaboration

## Collaboration Overview

CKEditor 5's architecture supports collaborative editing, enabling multiple authors to work simultaneously on rich text documents.

### Core Features

- **Comments**: Attach sidenotes to document fragments
- **Track Changes**: Automatic suggestion marking during editing
- **Revision History**: Document versioning tool

### Collaboration Modes

**Asynchronous Collaboration**: Sequential workflows without simultaneous editing

**Real-Time Collaboration**: Concurrent editing with automatic conflict resolution, live synchronization, and user presence indicators

---

## Track Changes

Track changes (suggestion mode) enables users to monitor and manage document modifications across multiple editors.

### Installation

```javascript
import { ClassicEditor } from 'ckeditor5';
import { TrackChanges } from 'ckeditor5-premium-features';

ClassicEditor.create(document.querySelector('#editor'), {
  licenseKey: '<YOUR_LICENSE_KEY>',
  plugins: [TrackChanges],
  toolbar: ['trackChanges']
})
```

### Force Track Changes Enabled

```javascript
editor.execute('trackChanges');
```

### Data Export Options

```javascript
// Default with suggestion markup
editor.getData();

// With visual highlights (not reloadable)
editor.getData({ showSuggestionHighlights: true });
```

---

## Comments

The Comments feature enables collaborative annotation of document content.

### HTML Markup Structure

**Text Comments:**
```html
<p>They are <comment-start name="b39dd790"></comment-start>
awesome<comment-end name="b39dd790"></comment-end>.</p>
```

**Block Element Comments:**
```html
<figure class="image" data-comment-end-after="b39dd790"
data-comment-start-before="b39dd790">
    <img src="foo.jpg">
</figure>
```

### Data Export

```javascript
// With comment highlights
editor.getData( { showCommentHighlights: true } );

// Without resolved comments
editor.getData( { ignoreResolvedComments: true } );
```

---

## Revision History

The revision history feature functions as a document versioning tool, enabling users to track content evolution over time.

### Key Capabilities

- Create named historical versions
- View chronological history
- Restore previous versions
- Compare revisions side-by-side

---

# Document Conversion

## Export to PDF

The Export to PDF feature enables users to generate PDF files directly from the CKEditor 5 editor.

### Installation

```javascript
import { ClassicEditor } from 'ckeditor5';
import { ExportPdf } from 'ckeditor5-premium-features';

ClassicEditor.create(document.querySelector('#editor'), {
  licenseKey: '<YOUR_LICENSE_KEY>',
  plugins: [ExportPdf],
  toolbar: ['exportPdf'],
  exportPdf: {
    stylesheets: ['./styles.css'],
    fileName: 'document.pdf',
    converterOptions: {
      format: 'A4',
      margin_top: '15mm',
      margin_bottom: '15mm',
      margin_right: '15mm',
      margin_left: '15mm',
      page_orientation: 'portrait'
    }
  }
})
```

### Headers and Footers

```javascript
converterOptions: {
  header_html: '<div class="styled">Header content</div>',
  footer_html: '<div class="styled-counter"><span class="pageNumber"></span></div>',
  header_and_footer_css: '#header, #footer { background: hsl(0, 0%, 95%); }'
}
```

### API Usage

```javascript
const config = editor.config.get('exportPdf');
editor.execute('exportPdf', config);
```

---

## Export to Word

The export to Word feature enables users to generate `.docx` files directly from the CKEditor 5 editor.

### Installation

```javascript
import { ClassicEditor } from 'ckeditor5';
import { ExportWord } from 'ckeditor5-premium-features';

ClassicEditor.create(document.querySelector('#editor'), {
  licenseKey: '<YOUR_LICENSE_KEY>',
  plugins: [ExportWord],
  toolbar: ['exportWord'],
  exportWord: {
    stylesheets: ['./styles.css'],
    fileName: 'document.docx',
    converterOptions: {
      document: {
        size: 'Letter',
        orientation: 'portrait',
        margin: {
          top: '19mm',
          bottom: '19mm',
          right: '19mm',
          left: '19mm'
        }
      }
    }
  }
})
```

---

## Import from Word

The Import from Word feature enables users to upload `.docx` files directly into the CKEditor 5 editor.

### Installation

```javascript
import { ClassicEditor, GeneralHtmlSupport } from 'ckeditor5';
import { ImportWord } from 'ckeditor5-premium-features';

ClassicEditor.create(document.querySelector('#editor'), {
  licenseKey: 'YOUR_LICENSE_KEY',
  plugins: [ImportWord, GeneralHtmlSupport],
  toolbar: ['importWord'],
  importWord: {
    tokenUrl: 'https://your-token-endpoint'
  }
});
```

---

## Paste from Office

The Paste from Office feature enables users to paste content from Microsoft Word and Excel while preserving original structure and formatting.

### Supported Content Types

- Text styling (bold, italic, underline)
- Heading levels
- Hyperlinks
- Ordered and unordered lists
- Tables
- Images

### Installation

```javascript
import { ClassicEditor, PasteFromOffice } from 'ckeditor5';

ClassicEditor.create(document.querySelector('#editor'), {
  plugins: [PasteFromOffice]
})
```

---

## Markdown Output

CKEditor 5 includes a Markdown plugin that enables output conversion from HTML to GitHub Flavored Markdown (GFM).

### Installation

```javascript
import { ClassicEditor, Markdown } from 'ckeditor5';

ClassicEditor.create(document.querySelector('#editor'), {
  plugins: [Markdown]
})
```

### Data Processing

```javascript
editor.getData();        // Returns Markdown format
editor.setData(markdown); // Accepts Markdown input
```

### Supported Elements

- **Emphasis**: Bold, italic, strikethrough
- **Links**: Standard hyperlink syntax
- **Code**: Inline code and code blocks
- **Block Elements**: Headings, block quotes, lists, horizontal rules

---

# Editor Features

## Source Code Editing

The source editing feature enables users to view and edit document source code directly.

### Installation

```javascript
import { ClassicEditor, SourceEditing } from 'ckeditor5';

ClassicEditor.create(document.querySelector('#editor'), {
  licenseKey: '<YOUR_LICENSE_KEY>',
  plugins: [SourceEditing],
  toolbar: ['sourceEditing']
})
```

### Markdown Integration

When paired with the Markdown output plugin, source editing displays Markdown syntax instead of HTML.

### Limitations

- Real-time collaboration changes aren't reflected in source mode
- Unsupported HTML tags are filtered out
- All toolbar buttons disable during source editing

---

## Read-Only Mode

CKEditor 5 provides built-in read-only mode functionality that prevents users from editing content.

### Core API

```javascript
// Enable read-only mode
editor.enableReadOnlyMode('my-feature-id');

// Disable read-only mode
editor.disableReadOnlyMode('my-feature-id');

// Check status
editor.isReadOnly;
```

### Toolbar Visibility Management

```javascript
editor.on('change:isReadOnly', (evt, propertyName, isReadOnly) => {
  if (isReadOnly) {
    toolbarElement.style.display = 'none';
  } else {
    toolbarElement.style.display = 'flex';
  }
});
```

---

## Restricted Editing

The restricted editing feature enables two distinct editing modes for template-based document workflows.

### Standard Editing Mode

Full editing capabilities with ability to designate editable regions.

### Restricted Editing Mode

Users can only edit content within designated regions.

### Installation

**Standard Mode:**
```javascript
import { StandardEditingMode } from 'ckeditor5-premium-features';
```

**Restricted Mode:**
```javascript
import { RestrictedEditingMode } from 'ckeditor5-premium-features';
```

### Allowing Specific Commands in Inline Fields

```javascript
restrictedEditing: {
  allowedCommands: [ 'bold' ]
}
```

---

## Undo/Redo

The undo/redo feature enables users to withdraw recent content changes and restore them.

### Installation

```javascript
import { ClassicEditor, Undo } from 'ckeditor5';

ClassicEditor
  .create(document.querySelector('#editor'), {
    licenseKey: '<YOUR_LICENSE_KEY>',
    plugins: [Undo],
    toolbar: ['undo', 'redo'],
  })
```

### Keyboard Shortcuts

- **Undo**: Ctrl+Z or Cmd+Z (Mac)
- **Redo**: Ctrl+Y or Ctrl+Shift+Z

### API Usage

```javascript
editor.execute('undo');
editor.execute('redo');

// Selective undo (for collaboration)
editor.execute('undo', batchToUndo);
```

---

## Select All

The Select All feature enables users to select the entire editor content.

### Keyboard Shortcut

**Ctrl/Cmd+A**

### Installation

```javascript
import { ClassicEditor, SelectAll } from 'ckeditor5';

ClassicEditor
  .create( document.querySelector( '#editor' ), {
    licenseKey: '<YOUR_LICENSE_KEY>',
    plugins: [ SelectAll ],
    toolbar: [ 'selectAll' ],
  } )
```

### API Usage

```javascript
editor.execute( 'selectAll' );
```

---

## Show Blocks

The show blocks feature enables content creators to visualize all block-level elements with outlines and element names.

### Installation

```javascript
import { ClassicEditor, ShowBlocks } from 'ckeditor5';

ClassicEditor.create(document.querySelector('#editor'), {
  licenseKey: '<YOUR_LICENSE_KEY>',
  plugins: [ShowBlocks],
  toolbar: ['showBlocks'],
})
```

### API Usage

```javascript
editor.execute('showBlocks');
```

---

## Drag and Drop

The drag and drop functionality enables users to move text and content blocks within the editor interface.

### Installation

```javascript
import { ClassicEditor, Clipboard } from 'ckeditor5';

ClassicEditor
  .create( document.querySelector( '#editor' ), {
    licenseKey: '<YOUR_LICENSE_KEY>',
    plugins: [ Clipboard ],
  })
```

### Customization

```css
:root {
  --ck-clipboard-drop-target-color: green;
}
```

---

# Document Features

## Document Title

The document title feature provides a dedicated single title field at the beginning of your document.

### Installation

```javascript
import { ClassicEditor, Title } from 'ckeditor5';

ClassicEditor
  .create( document.querySelector( '#editor' ), {
    licenseKey: '<YOUR_LICENSE_KEY>',
    plugins: [ Title ],
    title: {
      placeholder: 'My custom placeholder for the title'
    },
    placeholder: 'My custom placeholder for the body'
  } )
```

### Keyboard Navigation

- **Tab**: Move from title to body
- **Shift+Tab**: Return from body to title
- **Enter/Backspace**: Navigate between sections

### Output Format

```html
<h1>Document Title</h1>
```

---

## Page Break

The page break feature enables users to insert page breaks into document content.

### Installation

```javascript
import { ClassicEditor, PageBreak } from 'ckeditor5';

ClassicEditor
  .create( document.querySelector( '#editor' ), {
    licenseKey: '<YOUR_LICENSE_KEY>',
    plugins: [ PageBreak ],
    toolbar: [ 'pageBreak' ]
  } )
```

### API Usage

```javascript
editor.execute( 'pageBreak' );
```

---

# Accessibility and Language

## Accessibility Support

CKEditor 5 incorporates comprehensive accessibility features including keyboard navigation, screen reader support, and semantic output markup.

### Standards Compliance

- WCAG 2.2 (levels A and AA)
- Section 508 of the Rehabilitation Act

### Recommended Software

- **Windows**: Google Chrome with NVDA
- **macOS**: Safari with VoiceOver

### Key Keyboard Shortcuts

| Action | Windows/Linux | macOS |
|--------|---------------|-------|
| Undo | Ctrl+Z | ⌘Z |
| Redo | Ctrl+Y | ⌘Y |
| Bold | Ctrl+B | ⌘B |
| Italic | Ctrl+I | ⌘I |
| Create link | Ctrl+K | ⌘K |
| Find | Ctrl+F | ⌘F |
| Accessibility help | Alt+0 | ⌥0 |
| Focus toolbar | Alt+F10 | ⌥F10 |

---

## Text Part Language

The Text Part Language feature enables marking language fragments within content for browsers and screen readers.

### Installation

```javascript
import { ClassicEditor, TextPartLanguage } from 'ckeditor5';

ClassicEditor.create(document.querySelector('#editor'), {
  plugins: [TextPartLanguage],
  toolbar: ['textPartLanguage'],
  language: {
    textPartLanguage: [
      { title: 'Arabic', languageCode: 'ar' },
      { title: 'French', languageCode: 'fr' },
      { title: 'Spanish', languageCode: 'es' }
    ]
  }
})
```

### API Usage

```javascript
editor.execute( 'textPartLanguage', { languageCode: 'es' } );
```

---

# AI Features

## AI Assistant (Legacy)

AI Assistant is the initial AI feature implementation for CKEditor 5, now superseded by the more advanced CKEditor AI.

### Key Capabilities

1. **Predefined Commands** - Quick access to common tasks via toolbar
2. **Custom Queries** - Open-ended AI interactions

### Supported AI Providers

- OpenAI
- Azure OpenAI
- Amazon Bedrock
- Custom models

### Limitations

- Inactive when selections contain media embeds, HTML embeds, or tables of contents
- Removes comments and suggestions during processing
- May produce broken image links in certain scenarios

---

# Utilities

## Watchdog

The watchdog utility safeguards against data loss when CKEditor 5 instances encounter unexpected failures.

### Editor Watchdog

```javascript
import { EditorWatchdog } from 'ckeditor5';

const watchdog = new EditorWatchdog(ClassicEditor, {
  crashNumberLimit: 3,
  minimumNonErrorTimePeriod: 5000,
  saveInterval: 5000
});

watchdog.create(document.querySelector('#editor'), {
  licenseKey: '<KEY>',
  plugins: [Essentials, Paragraph, Bold, Italic],
  toolbar: ['bold', 'italic']
});
```

### Context Watchdog

```javascript
import { ContextWatchdog, Context } from 'ckeditor5';

const watchdog = new ContextWatchdog(Context, {
  crashNumberLimit: 10
});

await watchdog.create({
  plugins: [/* context plugins */]
});

await watchdog.add({
  id: 'editor1',
  type: 'editor',
  sourceElementOrData: document.querySelector('#editor'),
  config: { /* editor config */ },
  creator: (element, config) => ClassicEditor.create(element, config)
});
```

### Event Listeners

```javascript
watchdog.on('error', (error) => { /* handle crash */ });
watchdog.on('restart', () => { /* handle recovery */ });
watchdog.on('stateChange', () => { /* monitor state */ });
```

### State Values

- `initializing` – Before first startup or post-crash recovery
- `ready` – Functional editor state
- `crashed` – Transient error condition
- `crashedPermanently` – Unrecoverable failure state
- `destroyed` – User-initiated destruction

---

## Spelling and Grammar Checking

CKEditor 5 integrates **WProofreader SDK** for AI-powered spelling, grammar, and punctuation checking.

### Installation

```bash
npm install --save @webspellchecker/wproofreader-ckeditor5
```

### Configuration

```javascript
import { WProofreader } from '@webspellchecker/wproofreader-ckeditor5';

ClassicEditor.create(editorElement, {
  plugins: [WProofreader],
  toolbar: ['wproofreader'],
  wproofreader: {
    serviceId: 'your-service-ID',
    srcUrl: 'https://svc.webspellchecker.net/spellcheck31/wscbundle/wscbundle.js'
  }
})
```

### Supported Languages

American, Australian, and British English; Arabic; Brazilian Portuguese; Danish; Dutch; Finnish; French; German; Greek; Hebrew; Italian; Indonesian; Norwegian; Portuguese; Spanish; Swedish; Turkish; Ukrainian.

---

# Additional Resources

## Official Links

- **Documentation**: https://ckeditor.com/docs/ckeditor5/latest/
- **GitHub Repository**: https://github.com/ckeditor/ckeditor5
- **API Reference**: https://ckeditor.com/docs/ckeditor5/latest/api/
- **Feature Examples**: https://ckeditor.com/docs/ckeditor5/latest/examples/

## Development Tools

- **CKEditor 5 Inspector**: Browser extension for debugging and development
- **Online Builder**: https://ckeditor.com/ckeditor-5/online-builder/

## Support

- **Issue Tracker**: https://github.com/ckeditor/ckeditor5/issues
- **Stack Overflow**: https://stackoverflow.com/questions/tagged/ckeditor5
- **Community Forum**: https://github.com/ckeditor/ckeditor5/discussions

---

*This documentation was compiled from the official CKEditor 5 documentation. For the most up-to-date information, please visit https://ckeditor.com/docs/ckeditor5/latest/features/*
