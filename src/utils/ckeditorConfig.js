import {
  ClassicEditor,
  Autoformat,
  Bold,
  BlockQuote,
  Italic,
  Underline,
  Essentials,
  Heading,
  Image,
  ImageCaption,
  ImageStyle,
  ImageToolbar,
  ImageUpload,
  PictureEditing,
  Indent,
  Link,
  List,
  MediaEmbed,
  Paragraph,
  PasteFromOffice,
  Table,
  TableColumnResize,
  TableToolbar,
  TextTransformation,
  Font,
  FontColor,
  FontFamily,
  FontSize
} from 'ckeditor5'

import 'ckeditor5/ckeditor5.css'
import 'ckeditor5-premium-features/ckeditor5-premium-features.css'

export const editor = ClassicEditor

export const editorConfig = {
  plugins: [
    Autoformat,
    BlockQuote,
    Bold,
    Essentials,
    Heading,
    Image,
    ImageCaption,
    ImageStyle,
    ImageToolbar,
    ImageUpload,
    Indent,
    Italic,
    Link,
    List,
    MediaEmbed,
    Paragraph,
    PasteFromOffice,
    PictureEditing,
    Table,
    TableColumnResize,
    TableToolbar,
    TextTransformation,
    Underline,
    Font,
    FontColor,
    FontFamily,
    FontSize
  ],
  toolbar: [
    'undo',
    'redo',
    '|',
    'heading',
    'fontFamily',
    'fontSize',
    'fontColor',
    '|',
    {
      label: 'Estilo',
      icon: 'bold',
      items: ['bold', 'italic', 'underline']
    },
    '|',
    'link',
    'insertTable',
    /*'table',
    'blockQuote',*/
    'tableColumn',
    'tableRow',
    'mergeTableCells', // Añadido para solucionar el problema de la tabla
    '|',
    'uploadImage',
    'imageStyle:inline',
    'imageStyle:block',
    'imageStyle:side',
    '|',
    'bulletedList',
    'numberedList',
    '|',
    'outdent',
    'indent'
  ],
  heading: {
    options: [
      { model: 'paragraph', title: 'Párrafo', class: 'ck-heading_paragraph' },
      { model: 'heading1', view: 'h1', title: 'Encabezado 1', class: 'ck-heading_heading1' },
      { model: 'heading2', view: 'h2', title: 'Encabezado 2', class: 'ck-heading_heading2' },
      { model: 'heading3', view: 'h3', title: 'Encabezado 3', class: 'ck-heading_heading3' }
    ]
  },
  fontFamily: {
    options: [
      'default',
      'Arial, Helvetica, sans-serif',
      'Courier New, Courier, monospace',
      'Georgia, serif',
      'Lucida Sans Unicode, Lucida Grande, sans-serif',
      'Tahoma, Geneva, sans-serif',
      'Times New Roman, Times, serif',
      'Trebuchet MS, Helvetica, sans-serif',
      'Verdana, Geneva, sans-serif'
    ]
  },
  fontSize: {
    options: [9, 11, 13, 'default', 17, 19, 21]
  },
  fontColor: {
    colors: [
      { color: 'hsl(0, 0%, 0%)', label: 'Negro' },
      { color: 'hsl(0, 0%, 30%)', label: 'Gris oscuro' },
      { color: 'hsl(0, 0%, 60%)', label: 'Gris' },
      { color: 'hsl(0, 0%, 90%)', label: 'Gris claro' },
      { color: 'hsl(0, 0%, 100%)', label: 'Blanco', hasBorder: true },
      { color: 'hsl(0, 75%, 60%)', label: 'Rojo' },
      { color: 'hsl(30, 75%, 60%)', label: 'Naranja' },
      { color: 'hsl(60, 75%, 60%)', label: 'Amarillo' },
      { color: 'hsl(90, 75%, 60%)', label: 'Verde claro' },
      { color: 'hsl(120, 75%, 60%)', label: 'Verde' },
      { color: 'hsl(150, 75%, 60%)', label: 'Verde azulado' },
      { color: 'hsl(180, 75%, 60%)', label: 'Cian' },
      { color: 'hsl(210, 75%, 60%)', label: 'Azul claro' },
      { color: 'hsl(240, 75%, 60%)', label: 'Azul' },
      { color: 'hsl(270, 75%, 60%)', label: 'Púrpura' }
    ]
  },
  image: {
    toolbar: [
      'imageStyle:inline',
      'imageStyle:block',
      'imageStyle:side',
      '|',
      'toggleImageCaption',
      'imageTextAlternative'
    ]
  },
  table: {
    contentToolbar: ['tableColumn', 'tableRow', 'mergeTableCells']
  }
}
