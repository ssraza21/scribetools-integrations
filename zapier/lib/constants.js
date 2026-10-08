'use strict';

const { version } = require('../package.json');

const API_BASE = 'https://api.scribetools.com';
// Lets ScribeTools count usage by channel.
const CLIENT_HEADER = `zapier/${version}`;

const OUTCOME_CHOICES = [
  { value: 'editable_document', label: 'Editable Word document', sample: 'editable_document' },
  { value: 'extract_text', label: 'Extract text', sample: 'extract_text' },
  { value: 'table_extraction', label: 'Extract tables (Excel)', sample: 'table_extraction' },
  { value: 'translation', label: 'Translate document (Word)', sample: 'translation' },
  { value: 'searchable_pdf', label: 'Searchable PDF', sample: 'searchable_pdf' },
  { value: 'epub', label: 'EPUB eBook', sample: 'epub' },
];

const LANGUAGE_CHOICES = {
  auto: 'Detect automatically',
  ara: 'Arabic',
  urd: 'Urdu',
  fas: 'Persian',
  eng: 'English',
  fra: 'French',
  tur: 'Turkish',
  msa: 'Malay',
  ind: 'Indonesian',
  hin: 'Hindi',
  ben: 'Bengali',
  heb: 'Hebrew',
  deu: 'German',
  spa: 'Spanish',
  ita: 'Italian',
  por: 'Portuguese',
  nld: 'Dutch',
  rus: 'Russian',
  ukr: 'Ukrainian',
  pol: 'Polish',
  ces: 'Czech',
  swe: 'Swedish',
  nor: 'Norwegian',
  dan: 'Danish',
  fin: 'Finnish',
  ell: 'Greek',
  tha: 'Thai',
  vie: 'Vietnamese',
  jpn: 'Japanese',
  kor: 'Korean',
  chi_sim: 'Chinese (Simplified)',
  chi_tra: 'Chinese (Traditional)',
};

const TERMINAL_STATES = ['completed', 'partial', 'failed', 'cancelled'];
const INLINE_FORMATS = ['txt', 'json'];

module.exports = { API_BASE, CLIENT_HEADER, OUTCOME_CHOICES, LANGUAGE_CHOICES, TERMINAL_STATES, INLINE_FORMATS };
