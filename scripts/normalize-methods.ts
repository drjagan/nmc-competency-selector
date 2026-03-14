/**
 * normalize-methods.ts
 * Normalizes teaching_methods and assessment_methods columns to canonical forms.
 *
 * Usage:
 *   npx tsx scripts/normalize-methods.ts          # Preview mode (no DB writes)
 *   npx tsx scripts/normalize-methods.ts --apply  # Apply changes
 */

import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.join(__dirname, '..', 'src', 'data', 'competencies-2024.db');
const applyMode = process.argv.includes('--apply');

const db = new Database(DB_PATH);

// ─── CANONICAL MAPPINGS ──────────────────────────────────────────────────────
// Key = lowercase variant, Value = canonical form

const teachingMap: Record<string, string> = {
  // LGT
  'lgt': 'LGT', 'lgts': 'LGT', 'interactive lgt': 'LGT', 'interactive lgts': 'LGT',
  'image based lgt': 'LGT', 'video lgt': 'LGT', 'lgt with case discussion': 'LGT',
  'lgt with case discussions': 'LGT', 'lgt with case / clinical report discussion': 'LGT',
  'lgt with case discussion sgt': 'LGT, SGT', 'lgtsgt': 'LGT, SGT',
  'lgt.sgt': 'LGT, SGT', 'lgt with video': 'LGT',
  'lgt with case discussion, sdl': 'LGT, SDL',
  'lgtwithcasediscussion sgt': 'LGT, SGT',
  'lgtwithcasediscussion sgt, sdl': 'LGT, SGT, SDL',
  'lgt sgt': 'LGT, SGT', 'lgt sgt,': 'LGT, SGT', 'lgt,': 'LGT',
  'lecture': 'LGT',
  // SGT
  'sgt': 'SGT', 'sgts': 'SGT', 'sgt activity': 'SGT', 'sgt tutorial': 'SGT, Tutorial',
  'sgtactivity': 'SGT', 'small group discussion': 'SGT', 'small group teaching': 'SGT',
  'smallgroup': 'SGT', 'sgt observation & discussion': 'SGT',
  'sgt with images': 'SGT', 'sgt (sgt)': 'SGT',
  // DOAP
  'doap': 'DOAP', 'doaps': 'DOAP', 'doap session': 'DOAP', 'doap sessions': 'DOAP',
  'doap (practicals)': 'DOAP', 'doap practicals': 'DOAP',
  'doap (simulation or real life setting)': 'DOAP',
  'doaps (simulation or real life setting)': 'DOAP',
  'doaps, simulation lab (simulation or real life setting)': 'DOAP, Simulation',
  'doap in skills lab': 'DOAP, Skill lab', 'doap skills lab': 'DOAP, Skill lab',
  'doap, intraoperative': 'DOAP', 'doap in simulated environment': 'DOAP',
  'doap sgt': 'DOAP, SGT', 'doap tutorial': 'DOAP, Tutorial',
  'doap role play': 'DOAP, Role play',
  'doap fap clinical posting': 'DOAP, FAP Clinical posting',
  'doapfap clinical posting': 'DOAP, FAP Clinical posting',
  'doapfapclinicalposting': 'DOAP, FAP Clinical posting',
  'doap,fapclinicalposting': 'DOAP, FAP Clinical posting',
  // Bedside clinic
  'bedside clinic': 'Bedside clinic', 'bedside clinics': 'Bedside clinic',
  'bedsideclinic': 'Bedside clinic', 'bedsideclinics': 'Bedside clinic',
  'bed side clinic': 'Bedside clinic', 'bed side clinics': 'Bedside clinic',
  'bedside teaching': 'Bedside clinic', 'bed side teaching': 'Bedside clinic',
  'bedsideteaching': 'Bedside clinic', 'bedside': 'Bedside clinic',
  'bed side': 'Bedside clinic', 'bedside teaching clinic': 'Bedside clinic',
  'bedside clinicskills lab': 'Bedside clinic, Skill lab',
  'bedside clinicdoap': 'Bedside clinic, DOAP',
  'bedside clinic doap': 'Bedside clinic, DOAP',
  'bedside clinic doap sgt': 'Bedside clinic, DOAP, SGT',
  'bedside clinic sgt': 'Bedside clinic, SGT',
  'bedside clinic skills lab': 'Bedside clinic, Skill lab',
  'bed side clinic doap': 'Bedside clinic, DOAP',
  'bed side clinic doap session': 'Bedside clinic, DOAP',
  'lgt bedside clinic': 'LGT, Bedside clinic',
  'lgt bedside clinic, sgt': 'LGT, Bedside clinic, SGT',
  'lgt bedside clinic, doap': 'LGT, Bedside clinic, DOAP',
  'sgt bedside clinic role play': 'SGT, Bedside clinic, Role play',
  // Skill lab
  'skill lab': 'Skill lab', 'skills lab': 'Skill lab', 'skillslab': 'Skill lab',
  'skilllab': 'Skill lab', 'skill station': 'Skill lab', 'skills station': 'Skill lab',
  'skillsstation': 'Skill lab', 'skillstation': 'Skill lab', 'skillslab sessions': 'Skill lab',
  'skills': 'Skill lab', 'skills lab- doap': 'Skill lab, DOAP',
  'skillslab-doap': 'Skill lab, DOAP', 'out patient clinics skills lab': 'Bedside clinic, Skill lab',
  'out patient clinics, skills lab': 'Bedside clinic, Skill lab',
  'skill lab sessions': 'Skill lab', 'skills lab sessions': 'Skill lab',
  // Tutorial
  'tutorial': 'Tutorial', 'tutorials': 'Tutorial',
  // Seminar
  'seminar': 'Seminar', 'seminars': 'Seminar',
  'student seminar': 'Seminar', 'student seminars': 'Seminar',
  // Role play
  'role play': 'Role play', 'role-play': 'Role play', 'roleplay': 'Role play',
  'role plays': 'Role play',
  // Demonstration
  'demonstration': 'Demonstration', 'demonstration.': 'Demonstration',
  'demo': 'Demonstration', 'demonstrations': 'Demonstration',
  'clinical demonstration': 'Demonstration', 'clinical demonstration.': 'Demonstration',
  'clinical': 'Clinical', 'clinical , demonstration': 'Clinical, Demonstration',
  'clinical, demonstration': 'Clinical, Demonstration',
  'clinical, demonstration.': 'Clinical, Demonstration',
  'video demo.': 'Demonstration', 'video demo': 'Demonstration',
  'video demonstration': 'Demonstration',
  // SDL
  'sdl': 'SDL', 'sdl,': 'SDL', 'self-directed learning (sdl)': 'SDL',
  // Videos/Animations
  'animations': 'Animations/Videos', 'videos': 'Animations/Videos',
  'video': 'Animations/Videos', 'animations, videos': 'Animations/Videos',
  // Field visit
  'field visit': 'Field visit',
  // Panel discussion
  'panel discussion': 'Panel discussion',
  // CBL
  'cbl': 'CBL',
  // PBL
  'pbl': 'PBL',
  // ECE
  'ece': 'ECE',
  // Simulation
  'simulation': 'Simulation', 'simulations': 'Simulation', 'simulation,doap': 'Simulation, DOAP',
  // Dissection
  'dissection': 'Dissection',
  // Practical
  'practical': 'Practical', 'practicals': 'Practical',
  'practicals / seminars': 'Practical', 'practicals/ seminars': 'Practical',
  'practicals /seminars': 'Practical', 'practicals/seminars': 'Practical',
  // Debate
  'debate': 'Debate',
  // Flipped classroom
  'flipped classroom': 'Flipped classroom', 'flipped class room': 'Flipped classroom',
  'flippedclassroom': 'Flipped classroom', 'flippedclass room': 'Flipped classroom',
  // Prescription writing
  'prescription writing': 'Prescription writing', 'prescription critique': 'Prescription writing',
  // Symposium
  'symposium': 'Symposium',
  // Case discussion
  'case discussion': 'Case discussion', 'case-based discussion': 'Case discussion',
  'casebased discussion': 'Case discussion', 'case based discussion': 'Case discussion',
  'case-baseddiscussionwith reports (practicals)': 'Case discussion',
  'case based exercise': 'Case discussion', 'case studies': 'Case discussion',
  'case-based group discussion': 'Case discussion',
  'casediscussion sgt': 'Case discussion, SGT',
  // Autopsy
  'autopsy': 'Autopsy', 'autopsy doap': 'Autopsy, DOAP',
  'autopsy ,doap': 'Autopsy, DOAP', 'autopsy, doap': 'Autopsy, DOAP',
  // FAP Clinical posting
  'fap clinical posting': 'FAP Clinical posting', 'fapclinicalposting': 'FAP Clinical posting',
  'lgt fap clinical posting': 'LGT, FAP Clinical posting',
  'sgt fap clinical posting': 'SGT, FAP Clinical posting',
  'doap fap clinical posting': 'DOAP, FAP Clinical posting',
  // Standardized patients
  'standardized patients': 'Standardized patients', 'standardizedpatients': 'Standardized patients',
  // Direct observation
  'direct observation': 'Direct observation',
  // Misc
  'outreach activities': 'Outreach activities',
  'role modelling': 'Role modelling',
  'cine-education': 'Cine-education',
  'home assignment': 'Home assignment', 'home assignment.': 'Home assignment',
  'visit to hospital': 'Field visit', 'moot court': 'Moot court', 'mootcourt': 'Moot court',
  'court visits': 'Moot court',
  'y': '', 'n': '',
  // Additional variants found during testing
  'bed-side clinic': 'Bedside clinic', 'clinics': 'Bedside clinic',
  'lgt. sgt': 'LGT, SGT', 'sgt discussion': 'SGT',
  'cbd': 'CBL', 'discussion': 'SGT',
  'ospe': 'OSPE', 'practical exercises': 'Practical',
  'cbl. prescription writing': 'CBL, Prescription writing',
  'sgt doap(clinical lab)': 'SGT, DOAP', 'doap (clinical lab)': 'DOAP',
  'tutorials flipped classroom': 'Tutorial, Flipped classroom',
  'small group discussion bedside clinics': 'SGT, Bedside clinic',
  'ece (classroom': 'ECE', 'ece(classroom': 'ECE', 'hospital setting)': '',
  'ece- visit to blood bank flipped classroom': 'ECE, Flipped classroom',
  'ece- visit to blood bank': 'ECE',
  'can be covered in pandemic module sessions': '',
  'visit to clinical research facility': 'Field visit',
  'visit to ivf lab': 'Field visit', 'visit to pain clinic': 'Field visit',
  'visit to sleep lab': 'Field visit',
  'demonstration of devices used in br asthma': 'Demonstration',
  'graphs': '',
  // Compound space-separated values that appear frequently
  'lgt sgt ece': 'LGT, SGT, ECE',
  'lgt sgt doap': 'LGT, SGT, DOAP',
  'lgt sgt flipped classroom': 'LGT, SGT, Flipped classroom',
  'lgt sgt, student seminar': 'LGT, SGT, Seminar',
  'lgt sgt ,student seminar': 'LGT, SGT, Seminar',
  'lgt sgt / student seminars': 'LGT, SGT, Seminar',
  'lgt student seminar': 'LGT, Seminar',
  'lgt flipped classroom': 'LGT, Flipped classroom',
  'sdl/mootcourt': 'SDL, Moot court',
  'sdl, sgt with case / clinical report discussion': 'SDL, SGT',
  'sgt, bedsideclinics,lgt': 'SGT, Bedside clinic, LGT',
  'sgt,bedsideteaching': 'SGT, Bedside clinic',
  'sgt,bedsideteaching,': 'SGT, Bedside clinic',
  'sgt,bedside clinic': 'SGT, Bedside clinic',
  'sgt,roleplay, skills assessment': 'SGT, Role play, Skill assessment',
  'sgt,skilllab': 'SGT, Skill lab',
  'sgt,doap': 'SGT, DOAP',
  'sgt,lgt': 'SGT, LGT',
  'sgt, skill lab': 'SGT, Skill lab',
  'roleplay,videos,actual encounters': 'Role play, Animations/Videos',
  'lgt,sgts': 'LGT, SGT',
  'lgt,sgt': 'LGT, SGT',
  'lgt,demonstration': 'LGT, Demonstration',
  'lgt,sdl': 'LGT, SDL',
  'lgt,debate': 'LGT, Debate',
  'lgt,cbl/pbl,prescription writing': 'LGT, CBL, PBL, Prescription writing',
  'lgt,smallgroup': 'LGT, SGT',
  'lgt,small groupdiscussion, sdl': 'LGT, SGT, SDL',
  'lgt,bedsideclinic,sdl': 'LGT, Bedside clinic, SDL',
  'lgt,seminars, sdl': 'LGT, Seminar, SDL',
  'lgt,sgt (withmodels /videos/av aids, etc.)': 'LGT, SGT',
  'lgt,sgt activity': 'LGT, SGT',
  'lgt.sgt,doap': 'LGT, SGT, DOAP',
  'lgtsgt,case-based discussion': 'LGT, SGT, Case discussion',
  'lgt, casediscussion sgt': 'LGT, Case discussion, SGT',
  'lgt, problem/ case-based group discussion, prescription writing': 'LGT, Case discussion, Prescription writing',
  'lgt, integration module, cbl, sdl, prescription writing': 'LGT, CBL, SDL, Prescription writing',
  'interpretational exercises (practicals)': 'Practical',
  'interpretationalexercises (practicals)': 'Practical',
  'demonstration of tld badge, sdl': 'Demonstration, SDL',
  'lgt , sgt, flipped class room': 'LGT, SGT, Flipped classroom',
  'lgt/ sgts': 'LGT, SGT',
  'hospital rounds demonstrating equipment and signages, case based interactive lecture or case- based discussion for modality selection': 'LGT, Case discussion',
  'case scenario-based discussion in lecture, sgt': 'LGT, SGT',
  'case scenario-based discussions in lecture, sgt for history taking': 'LGT, SGT',
  'case-baseddiscussionwith reports (practicals)': 'Case discussion',
  'centre visit - sgt': 'SGT, Field visit',
  'case based exercise, sgt': 'Case discussion, SGT',
  'practical, doap, cbl, prescription writing': 'Practical, DOAP, CBL, Prescription writing',
  'demonstration (sgt) & lab visit': 'Demonstration, SGT, Field visit',
  'clinical case studies discussion (sgt)': 'Case discussion, SGT',
  'ece-sgt(bedside': 'ECE, SGT, Bedside clinic',
  'ward visit': 'Field visit', 'medical record department': 'Field visit',
  'casualty)': 'Bedside clinic',
  'bedsideclinic(ward': 'Bedside clinic',
  'bedsideclinic (ward': 'Bedside clinic',
  'bed side clinic or autopsy': 'Bedside clinic, Autopsy',
  'direct observation in elective': 'Direct observation',
  'emergency situation': '',
  'scenarios': 'Case discussion',
  'sgt case studies': 'SGT, Case discussion',
  'doap,bedside clinic': 'DOAP, Bedside clinic',
  'doap, role-play, sgt, practicals': 'DOAP, Role play, SGT, Practical',
  'doap,role play': 'DOAP, Role play',
  'doap,sdl': 'DOAP, SDL',
  'doap,': 'DOAP',
  'videos on manikins, observe competencies and surgeries in or': 'Animations/Videos',
  'role play, videos, actual encounters': 'Role play, Animations/Videos',
  'role play, videos, actual encounters, plays': 'Role play, Animations/Videos',
  'sgt, doap, debate': 'SGT, DOAP, Debate',
  'sgt, doap, role plays/ simulations (mannequins, hybrid, computer)': 'SGT, DOAP, Simulation',
  'sgt, doapfap clinical posting': 'SGT, DOAP, FAP Clinical posting',
  'sgt, videos, doap, simulations, hybrid models': 'SGT, Animations/Videos, DOAP, Simulation',
  'sgt, doaps, case studies': 'SGT, DOAP, Case discussion',
  'sgt/ practicals / seminars, autopsy, doap': 'SGT, Practical, Autopsy, DOAP',
  'sgt/ practicals / seminars, bed side clinic, doap': 'SGT, Practical, Bedside clinic, DOAP',
  'sgt/ practicals / seminars, doap': 'SGT, Practical, DOAP',
  'sgt/ practicals / seminars, demonstration': 'SGT, Practical, Demonstration',
  'sgt/ practicals / seminars, role play, bed side clinic doap': 'SGT, Practical, Role play, Bedside clinic, DOAP',
};

const assessmentMap: Record<string, string> = {
  // Written
  'written': 'Written', 'written assessment': 'Written', 'written examination': 'Written',
  'theory': 'Written', 'short notes': 'Written', 'short note': 'Written',
  'short answer': 'Written', 'written,': 'Written', 'written.': 'Written',
  'assignments': 'Written',
  // MCQ
  'mcq': 'MCQ', 'mcqs': 'MCQ',
  // Viva voce
  'viva voce': 'Viva voce', 'viva voice': 'Viva voce', 'viva-voce': 'Viva voce',
  'vivavoce': 'Viva voce', 'vivavoice': 'Viva voce', 'viva': 'Viva voce',
  'viva- voce': 'Viva voce', 'vova voce': 'Viva voce', 'viva voce.': 'Viva voce',
  'viva voce/': 'Viva voce', 'orals': 'Viva voce',
  'viva voce, theory': 'Viva voce, Written',
  'viva voce practicals': 'Viva voce, Practical',
  'viva voce, case- based questions': 'Viva voce, Case based discussion',
  'viva voce, written': 'Viva voce, Written',
  'viva voce, case based discussion': 'Viva voce, Case based discussion',
  // Skill assessment
  'skill assessment': 'Skill assessment', 'skills assessment': 'Skill assessment',
  'skillassessment': 'Skill assessment', 'skillsassessment': 'Skill assessment',
  'sill assessment': 'Skill assessment', 'skill assessment.': 'Skill assessment',
  'skill assessment-': 'Skill assessment', 'skill': 'Skill assessment',
  'skills assessment -': 'Skill assessment',
  'checklist based skill assessment': 'Skill assessment',
  'skill assessment(wpba)': 'Skill assessment',
  // OSCE
  'osce': 'OSCE', 'osc e': 'OSCE', 'osce/simulation': 'OSCE',
  'osce viva voce': 'OSCE, Viva voce',
  'osce, checklist based skill assessment': 'OSCE, Skill assessment',
  'osce, rating scale, direct observation and feedback': 'OSCE, Direct observation',
  // OSPE
  'ospe': 'OSPE', 'ospe, written': 'OSPE, Written',
  'ospe, direct observation': 'OSPE, Direct observation',
  'ospe, direct observation with checklist': 'OSPE, Direct observation',
  'ospe, observation, scenario based questions': 'OSPE, Direct observation',
  'ospe, clinical case based exercises': 'OSPE, Case based exercise',
  // Logbook
  'logbook': 'Logbook', 'log book': 'Logbook', 'logbook entry': 'Logbook',
  'log book entry': 'Logbook', 'logbookentry': 'Logbook',
  'log book documentation': 'Logbook', 'logbook documentation': 'Logbook',
  'document in logbook': 'Logbook', 'document in log book': 'Logbook',
  'document in log boo k': 'Logbook',
  'documentinlogbook': 'Logbook', 'documentinlogboo k': 'Logbook',
  'documentinlog book': 'Logbook', 'documentinlogbook': 'Logbook',
  'documentation in logbook': 'Logbook',
  'documentation in': 'Logbook', 'documentation': 'Logbook',
  'lab log book': 'Logbook', 'log book/documentatio n': 'Logbook',
  'logbook, reflections': 'Logbook', 'log book entry of performance': 'Logbook',
  '(long/short case) documentation in journal': 'Long case, Short case, Logbook',
  '(long/short case/osce) documentation in journal': 'Long case, Short case, OSCE, Logbook',
  'documentation in logbook / viva voce,osce': 'Logbook, Viva voce, OSCE',
  'logbook documentation/osc e': 'Logbook, OSCE',
  'log book/ skill': 'Logbook, Skill assessment',
  'log book/ skill station/viva voce': 'Logbook, Skill lab, Viva voce',
  'log book/ skill station/viva voce /': 'Logbook, Skill lab, Viva voce',
  'log book/ skill station/viva voce / osce': 'Logbook, Skill lab, Viva voce, OSCE',
  'log book/ skill station/viva voce /osce': 'Logbook, Skill lab, Viva voce, OSCE',
  'log book/ viva voce': 'Logbook, Viva voce',
  'log book/ viva voce/osce': 'Logbook, Viva voce, OSCE',
  'log book/skill station/viva voce': 'Logbook, Skill lab, Viva voce',
  'log book/skill station/viva voce/ ospe': 'Logbook, Skill lab, Viva voce, OSPE',
  'log book documentation viva voce': 'Logbook, Viva voce',
  'log book/skills station': 'Logbook, Skill lab',
  // Long case / Short case
  'long case': 'Long case', 'short case': 'Short case',
  'long/short case': 'Long case, Short case',
  'long/short case or osce': 'Long case, Short case, OSCE',
  '(long/short case or': 'Long case, Short case',
  'long/short case/osce': 'Long case, Short case, OSCE',
  'long case /short case': 'Long case, Short case',
  'long case /short': 'Long case, Short case',
  'long case / short case': 'Long case, Short case',
  'long case/ short case': 'Long case, Short case',
  'short/long case': 'Long case, Short case',
  'short case/osce': 'Short case, OSCE',
  'short/long case , skill assessment -': 'Long case, Short case, Skill assessment',
  'short/long case skill assessment – osce': 'Long case, Short case, Skill assessment, OSCE',
  // Application based question
  'application based question': 'Application based question',
  'application based questions': 'Application based question',
  'application based': 'Application based question',
  'application': 'Application based question',
  'application based question/viva voce': 'Application based question, Viva voce',
  'application based question /viva voce': 'Application based question, Viva voce',
  'application based question /viva voice': 'Application based question, Viva voce',
  'application based question/ viva voce': 'Application based question, Viva voce',
  'application based question/ viva voice': 'Application based question, Viva voce',
  'application based question viva voce': 'Application based question, Viva voce',
  'application based questions / viva voce': 'Application based question, Viva voce',
  'application based questions / viva voce/': 'Application based question, Viva voce',
  'application based questions / viva voce/ osce': 'Application based question, Viva voce, OSCE',
  'application based questions / viva voce/ short case': 'Application based question, Viva voce, Short case',
  'application based questions viva voce': 'Application based question, Viva voce',
  'application based questions/ viva voce': 'Application based question, Viva voce',
  'application based question, , viva voce': 'Application based question, Viva voce',
  'application based question, /viva voce': 'Application based question, Viva voce',
  'application based question,/viva': 'Application based question, Viva voce',
  'application based question skill assessment-': 'Application based question, Skill assessment',
  'application based questions/skill assessment//osce': 'Application based question, Skill assessment, OSCE',
  'application based questions/skill assessment/written': 'Application based question, Skill assessment, Written',
  'application based questions/written/ vivavoce': 'Application based question, Written, Viva voce',
  'application based question/ viva voce': 'Application based question, Viva voce',
  'application based questions / viva voce': 'Application based question, Viva voce',
  'application based question long case /short case, skills assessment, osce': 'Application based question, Long case, Short case, Skill assessment, OSCE',
  'application based questions/skil l assessment/written': 'Application based question, Skill assessment, Written',
  // Case based
  'case based mcq': 'Case based MCQ',
  'case based exercise': 'Case based exercise', 'cased based exercises': 'Case based exercise',
  'case based exercises': 'Case based exercise',
  'case discussion exercise': 'Case based exercise',
  'case based discussion': 'Case based discussion',
  'case-based questions': 'Case based discussion',
  'case based discussion, osce': 'Case based discussion, OSCE',
  'case based discussion, osce, prescription writing': 'Case based discussion, OSCE, Prescription writing',
  'case based discussion, prescription writing, direct observation': 'Case based discussion, Prescription writing, Direct observation',
  'clinical case based exercises': 'Case based exercise',
  'case- based questions': 'Case based discussion',
  // DOPS
  'dops': 'DOPS', 'dops, osce': 'DOPS, OSCE',
  // Direct observation
  'direct observation': 'Direct observation',
  'direct observation and feedback': 'Direct observation',
  'direct observation with checklist': 'Direct observation',
  'direct observation, osce': 'Direct observation, OSCE',
  'direct observation, ospe': 'Direct observation, OSPE',
  'faculty observation': 'Direct observation',
  'observation': 'Direct observation',
  'observation, viva voce, scenario based questions': 'Direct observation, Viva voce',
  'observationbyfacult y': 'Direct observation',
  'observationbyfacult y/osce': 'Direct observation, OSCE',
  'observationbyfaculty': 'Direct observation',
  'osce, rating scale, direct observation and feedback': 'OSCE, Direct observation',
  // Clinical assessment
  'clinical assessment': 'Clinical assessment',
  'clinical assessment / viva voce': 'Clinical assessment, Viva voce',
  'clinical assessment / vivavoce': 'Clinical assessment, Viva voce',
  'clinical assessment/ viva voce': 'Clinical assessment, Viva voce',
  'clinical assessment/ viva voce, osce': 'Clinical assessment, Viva voce, OSCE',
  'clinical assessment/ viva voce/ osce': 'Clinical assessment, Viva voce, OSCE',
  'clinical assessment/viva voce': 'Clinical assessment, Viva voce',
  // Skill lab/station
  'skill lab': 'Skill lab', 'skills lab': 'Skill lab',
  'skill lab sessions': 'Skill lab', 'skills lab sessions': 'Skill lab',
  'skill station': 'Skill lab', 'skills station': 'Skill lab',
  'skillsstation': 'Skill lab', 'skillstation': 'Skill lab',
  'skill lab/ viva voce': 'Skill lab, Viva voce',
  // Prescription
  'prescription writing': 'Prescription writing', 'prescription audit': 'Prescription writing',
  'prescription': 'Prescription writing',
  // Tutorial
  'tutorial': 'Tutorial', 'tutorials': 'Tutorial',
  // Simulation
  'simulation': 'Simulation', 'simulations': 'Simulation', 'mannequin': 'Simulation',
  // Practical
  'practical exercise': 'Practical', 'practical exercises': 'Practical',
  'practical': 'Practical', 'practicals': 'Practical', 'practical case': 'Practical',
  'practical exercises /ospe': 'Practical, OSPE',
  'practical/ospe/ viva voce': 'Practical, OSPE, Viva voce',
  'practical/ospe/viva voce': 'Practical, OSPE, Viva voce',
  'practicals/ospe': 'Practical, OSPE',
  // Picture based MCQ
  'picture based mcqs': 'Picture based MCQ', 'picture basedmcqs': 'Picture based MCQ',
  // Scenario based
  'scenario based questions': 'Scenario based questions',
  'scenario based questions, viva voce': 'Scenario based questions, Viva voce',
  // Interpretational exercise
  'interpretational exercise': 'Interpretational exercise',
  'interpretational exercises': 'Interpretational exercise',
  'interpretation exercise': 'Interpretational exercise',
  'interpretational exercises /practical exercise': 'Interpretational exercise, Practical',
  'interpretational exercise, case based exercise, case based mcq, viva voce': 'Interpretational exercise, Case based exercise, Case based MCQ, Viva voce',
  // Role play
  'role play': 'Role play', 'role-play': 'Role play',
  // Self assessment
  'self assessment': 'Self assessment',
  // SGT / LGT in assessment context
  'sgt': 'SGT', 'sgt role play': 'SGT, Role play', 'sgt role plays': 'SGT, Role play',
  'sgt role plays role modelling': 'SGT, Role play', 'sgt role play role modelling': 'SGT, Role play',
  'lgt': 'LGT', 'lgt, sgt discussion': 'LGT, SGT', 'lgt,sgt': 'LGT, SGT',
  'lgt, sgt/ practicals / seminars': 'LGT, SGT, Practical',
  // DOAP in assessment
  'doap': 'DOAP', 'doap session': 'DOAP', 'doap role play': 'DOAP, Role play',
  'doap,video demonstration': 'DOAP',
  // Bedside clinic in assessment
  'bedside clinic': 'Bedside clinic', 'bedside clinic, doap role play': 'Bedside clinic, DOAP, Role play',
  'bedside clinic, doap': 'Bedside clinic, DOAP',
  'bedside clinic, doap, role play': 'Bedside clinic, DOAP, Role play',
  'bedside clinic, sgt': 'Bedside clinic, SGT',
  'bedside clinic doap': 'Bedside clinic, DOAP',
  'bedside clinic, sgt reflections writing': 'Bedside clinic, SGT',
  'bedside clinic, sgt – role play': 'Bedside clinic, SGT, Role play',
  'bedside clinic, sgt – role play': 'Bedside clinic, SGT, Role play',
  'bed side clinic, doap': 'Bedside clinic, DOAP',
  'bed side clinic, doap session': 'Bedside clinic, DOAP',
  'bed side clinic, sgt doap session': 'Bedside clinic, SGT, DOAP',
  // Reflections
  'reflections writing': 'Reflections', 'reflections': 'Reflections',
  // Rating scale
  'rating scale': 'Rating scale',
  // Mini CEX
  'mini cex': 'Mini CEX',
  'mini cex, case based discussion, osce': 'Mini CEX, Case based discussion, OSCE',
  // NIL / empty
  'nil': '', 'n': '', 'y': '', '-': '',
  // Additional assessment variants
  '(osce': 'OSCE', 'short': 'Short case',
  'application based question skill assessment': 'Application based question, Skill assessment',
  'case studies interpretation': '',
  'ospe (ldl calculate)': 'OSPE',
  'video assisted interactive lecture': 'LGT',
  // Documentation in Journal
  'documentation in journal': 'Logbook',
  // Video related
  'video demonstration': 'DOAP',
  'video assistedlgt': 'LGT', 'video assistedlecture': 'LGT',
  'video assisted lgt': 'LGT', 'video assisted lecture': 'LGT',
  'video assisted': 'LGT',
  // Compound values that need exact matching
  'small group discussion.doap': 'SGT, DOAP',
  'sgt, bedside clinics role play': 'SGT, Bedside clinic, Role play',
  'written/ clinicalassessme nt': 'Written, Clinical assessment',
  'written/ clinical assessment': 'Written, Clinical assessment',
  'written/clinical assessment/viva voce': 'Written, Clinical assessment, Viva voce',
  'written/osce/clinical assessment/ viva voce': 'Written, OSCE, Clinical assessment, Viva voce',
  'written/osce/clinical assessment/': 'Written, OSCE, Clinical assessment',
  'documentinlogbook': 'Logbook', 'documentinlogboo k': 'Logbook',
  'documentation inlogbook': 'Logbook',
  // Specific compound forms
  'log book/ skill station/viva voce': 'Logbook, Skill lab, Viva voce',
  'case discussion, video assisted lgt,sgt, teaching, skill lab sessions': 'Case discussion, LGT, SGT, Skill lab',
  'case discussion, video assisted lgt,sgt, teaching, skills lab sessions': 'Case discussion, LGT, SGT, Skill lab',
  'case discussion, video assistedlgt,sgt, teaching, skills lab sessions': 'Case discussion, LGT, SGT, Skill lab',
  'case discussion, video assisted lecture, sgt, teaching, skills lab sessions': 'Case discussion, LGT, SGT, Skill lab',
  'case discussion,video assisted lgt,sgt, teaching, skill lab sessions': 'Case discussion, LGT, SGT, Skill lab',
  'case based exercise, case based mcq, viva voce': 'Case based exercise, Case based MCQ, Viva voce',
  'case based exercise, case based mcq, interpretational exercise, viva voce': 'Case based exercise, Case based MCQ, Interpretational exercise, Viva voce',
  'case discussion exercise, case based mcq, interpretation exercise, viva voce': 'Case based exercise, Case based MCQ, Interpretational exercise, Viva voce',
  'case based exercise, written assessment, case based mcq, viva voce': 'Case based exercise, Written, Case based MCQ, Viva voce',
  'written assessment, case based mcq, viva voce': 'Written, Case based MCQ, Viva voce',
  'written assessment, case based mcq, viva voce, osce': 'Written, Case based MCQ, Viva voce, OSCE',
  'written assessment, case based exercise, case based mcq, viva voce': 'Written, Case based exercise, Case based MCQ, Viva voce',
  'written assessment, case discussion exercise, case based mcq, viva voce': 'Written, Case based exercise, Case based MCQ, Viva voce',
  'written assessment, mcq, viva voce': 'Written, MCQ, Viva voce',
  'written assessment, mcq, viva voce, interpretational exercise': 'Written, MCQ, Viva voce, Interpretational exercise',
  'written assessment, viva voce': 'Written, Viva voce',
  'written assessment/ viva voce': 'Written, Viva voce',
  'written assessment/viva voce/': 'Written, Viva voce',
  'written assessment/ viva voce/ case studies, ospe': 'Written, Viva voce, OSPE',
  'mcq, viva voce': 'MCQ, Viva voce',
  'mcq, written viva voce': 'MCQ, Written, Viva voce',
  'mcq, written, viva voce': 'MCQ, Written, Viva voce',
  'mcq/ written, viva voce': 'MCQ, Written, Viva voce',
  'mcq/written': 'MCQ, Written',
  'mcq/written / viva voce': 'MCQ, Written, Viva voce',
  'mcq/written viva voce': 'MCQ, Written, Viva voce',
  'mcq/written, viva voce': 'MCQ, Written, Viva voce',
  'mcq/written/ viva voce': 'MCQ, Written, Viva voce',
  'mcqs/ written, viva voce': 'MCQ, Written, Viva voce',
  'mcq, viva voce': 'MCQ, Viva voce',
  'mcq, written viva voce': 'MCQ, Written, Viva voce',
  // Skill assessment compounds
  'skill assessment osce': 'Skill assessment, OSCE',
  'skill assessment osce log book': 'Skill assessment, OSCE, Logbook',
  'skill assessment osce viva voce': 'Skill assessment, OSCE, Viva voce',
  'skill assessment osce, viva voce': 'Skill assessment, OSCE, Viva voce',
  'skill assessment /osce': 'Skill assessment, OSCE',
  'skill assessment / osce': 'Skill assessment, OSCE',
  'skill assessment / ospe': 'Skill assessment, OSPE',
  'skill assessment / short case': 'Skill assessment, Short case',
  'skill assessment ospe': 'Skill assessment, OSPE',
  'skill assessment/ osce': 'Skill assessment, OSCE',
  'skill assessment//osce': 'Skill assessment, OSCE',
  'skill assessment/osce': 'Skill assessment, OSCE',
  'skill assessment/log book': 'Skill assessment, Logbook',
  'skill assessment/short case': 'Skill assessment, Short case',
  'skill assessment/short case': 'Skill assessment, Short case',
  'skill assessment/ short case': 'Skill assessment, Short case',
  'skill assessment/written': 'Skill assessment, Written',
  'skill assessment/written / vivavoce': 'Skill assessment, Written, Viva voce',
  'skill assessment/written //osce': 'Skill assessment, Written, OSCE',
  'skill assessment/written /osce': 'Skill assessment, Written, OSCE',
  'skill assessment/written /viva voce': 'Skill assessment, Written, Viva voce',
  'skillassessment / logbook': 'Skill assessment, Logbook',
  'skillassessment/log book': 'Skill assessment, Logbook',
  'skillassessment/osc e': 'Skill assessment, OSCE',
  'skills assessment osce': 'Skill assessment, OSCE',
  'skillsassessment, log book': 'Skill assessment, Logbook',
  'skill assessment osce/ viva voce': 'Skill assessment, OSCE, Viva voce',
  'skill assessment osce/ viva voce)': 'Skill assessment, OSCE, Viva voce',
  'skill assessment (long/short case) viva voce': 'Skill assessment, Long case, Short case, Viva voce',
  'skill assessment (osce/ viva voce)': 'Skill assessment, OSCE, Viva voce',
  'skill assessment (short case / osce ) viva voce': 'Skill assessment, Short case, OSCE, Viva voce',
  'skill assessment (short case / osce)': 'Skill assessment, Short case, OSCE',
  'skill assessment (short case or osce)': 'Skill assessment, Short case, OSCE',
  'skill assessment/ viva voce/osce': 'Skill assessment, Viva voce, OSCE',
  'skill assessment/ skill assessment': 'Skill assessment',
  'viva voce/ skill assessment': 'Viva voce, Skill assessment',
  'skills assessment - osce': 'Skill assessment, OSCE',
  'skills assessment - osce viva voce': 'Skill assessment, OSCE, Viva voce',
  'skills assessment - short case/ osce/ documentation in journal': 'Skill assessment, Short case, OSCE, Logbook',
  'skills assessment - short case/osce documentation in': 'Skill assessment, Short case, OSCE, Logbook',
  'skills assessment – osce on mannequin': 'Skill assessment, OSCE',
  // Long case / Short case compounds
  'long case /short case': 'Long case, Short case',
  'long case /short case skill assessment osce': 'Long case, Short case, Skill assessment, OSCE',
  'long case /short case skills assessment osce': 'Long case, Short case, Skill assessment, OSCE',
  'long case /short case, skill assessment, osce': 'Long case, Short case, Skill assessment, OSCE',
  'long case /short case, skill assessment, osce, viva voce': 'Long case, Short case, Skill assessment, OSCE, Viva voce',
  'long case/ short case skill assessment, osce': 'Long case, Short case, Skill assessment, OSCE',
  'long case /short case skill assessment – osce, viva voce': 'Long case, Short case, Skill assessment, OSCE, Viva voce',
  'long case / short case, skill assessment, osce': 'Long case, Short case, Skill assessment, OSCE',
  'short case skill assessment osce': 'Short case, Skill assessment, OSCE',
  'short case skill assessment osce, viva voce': 'Short case, Skill assessment, OSCE, Viva voce',
  // Written compound forms
  'written (short notes, part of structured essay), tutorials, problem solving exercises, osce': 'Written, Tutorial, OSCE',
  'written examination, tutorials, osce, picture based mcqs': 'Written, Tutorial, OSCE, Picture based MCQ',
  'written/ viva voce': 'Written, Viva voce', 'written / viva voce': 'Written, Viva voce',
  'written /viva voce': 'Written, Viva voce', 'written viva voce': 'Written, Viva voce',
  'written / viva': 'Written, Viva voce', 'written /viva': 'Written, Viva voce',
  'written/ viva voce.': 'Written, Viva voce', 'written/ viva voce/': 'Written, Viva voce',
  'written/viva voce': 'Written, Viva voce', 'written/viva-voce': 'Written, Viva voce',
  'written/viva/ skill assessment': 'Written, Viva voce, Skill assessment',
  'written/viva/ tutorial/ prescription audit': 'Written, Viva voce, Tutorial, Prescription writing',
  'written/ vivavoce': 'Written, Viva voce',
  'written/ vivavoce//osce': 'Written, Viva voce, OSCE',
  'written/ vivavoce/log book': 'Written, Viva voce, Logbook',
  'written/vivavoce': 'Written, Viva voce',
  'written/vivavoce/ osce': 'Written, Viva voce, OSCE',
  'written/vivavoce/ osce/ simulation': 'Written, Viva voce, OSCE, Simulation',
  'written/vivavoce/ skill assessment': 'Written, Viva voce, Skill assessment',
  'written/vivavoce/ skillassessment': 'Written, Viva voce, Skill assessment',
  'written/vivavoce/s killassessment': 'Written, Viva voce, Skill assessment',
  'vivavoce/written/skill assessment': 'Viva voce, Written, Skill assessment',
  'written/vova voce': 'Written, Viva voce',
  'written/vova voce fap clinical posting': 'Written, Viva voce, FAP Clinical posting',
  'written/vova voce/ skill assessment': 'Written, Viva voce, Skill assessment',
  'written/vova voce/ skill assessment /osce': 'Written, Viva voce, Skill assessment, OSCE',
  'written/vova voce/ skill assessment/osce': 'Written, Viva voce, Skill assessment, OSCE',
  'written/vova voce/osce': 'Written, Viva voce, OSCE',
  'written/viva voce, prescription': 'Written, Viva voce, Prescription writing',
  'written/viva voce, clinical exam': 'Written, Viva voce, Clinical assessment',
  'written/ viva voce/mcq': 'Written, Viva voce, MCQ',
  'written, viva voce': 'Written, Viva voce', 'written, viva voce': 'Written, Viva voce',
  'written, viva voce, osce': 'Written, Viva voce, OSCE',
  'written, viva voce, ospe': 'Written, Viva voce, OSPE',
  'written, viva voce, practical case': 'Written, Viva voce, Practical',
  'written /viva voice': 'Written, Viva voce',
  'written/viva voice': 'Written, Viva voce',
  // Written + OSCE/OSPE
  'written, osce': 'Written, OSCE', 'written, osce,': 'Written, OSCE',
  'written, ospe': 'Written, OSPE',
  'written, osce/ospe': 'Written, OSCE, OSPE',
  'written, osce, case based discussion': 'Written, OSCE, Case based discussion',
  'written, osce, direct observation, picture based mcqs, prescription writing': 'Written, OSCE, Direct observation, Picture based MCQ, Prescription writing',
  'written, osce, picture based mcqs': 'Written, OSCE, Picture based MCQ',
  'written,tutorials, picture based mcqs, osce': 'Written, Tutorial, Picture based MCQ, OSCE',
  'written,tutorials, prescription': 'Written, Tutorial, Prescription writing',
  'written/osce': 'Written, OSCE',
  'written/ osce / clinical assessment /viva voce': 'Written, OSCE, Clinical assessment, Viva voce',
  'written/ osce/ clinical assessment /viva voce': 'Written, OSCE, Clinical assessment, Viva voce',
  'written/ osce/ clinical assessment/viva voce': 'Written, OSCE, Clinical assessment, Viva voce',
  'written/ osce/ clinical assessment /viva voce': 'Written, OSCE, Clinical assessment, Viva voce',
  'written/ osce/clinical assessment/viva voce': 'Written, OSCE, Clinical assessment, Viva voce',
  'written/ ospe': 'Written, OSPE',
  'written/ ospe, direct observation': 'Written, OSPE, Direct observation',
  // Written + Tutorial
  'written, tutorial': 'Written, Tutorial', 'written, tutorials': 'Written, Tutorial',
  'written/ tutorial': 'Written, Tutorial', 'written/tutorial': 'Written, Tutorial',
  'written/ tutorial, ospe': 'Written, Tutorial, OSPE',
  'written/ tutorial, prescription audit': 'Written, Tutorial, Prescription writing',
  'written/ tutorial/ direct observations': 'Written, Tutorial, Direct observation',
  'written/ tutorial/ prescription audit': 'Written, Tutorial, Prescription writing',
  'written, tutorials, case based discussion': 'Written, Tutorial, Case based discussion',
  'written, tutorials, case based discussion, osce': 'Written, Tutorial, Case based discussion, OSCE',
  'written, tutorials, case based discussion, written, osce, direct observation, picture based mcqs': 'Written, Tutorial, Case based discussion, OSCE, Direct observation, Picture based MCQ',
  'written, tutorials, direct observation': 'Written, Tutorial, Direct observation',
  'written, tutorials, direct observation, osce': 'Written, Tutorial, Direct observation, OSCE',
  'written, tutorials, direct observation, osce, prescription writing': 'Written, Tutorial, Direct observation, OSCE, Prescription writing',
  'written, tutorials, direct observation, case based discussion': 'Written, Tutorial, Direct observation, Case based discussion',
  'written, tutorials, osce': 'Written, Tutorial, OSCE',
  'written, tutorials, osce, written,osce, direct observation, picture basedmcqs': 'Written, Tutorial, OSCE, Direct observation, Picture based MCQ',
  'written, tutorials , case based discussion, osce, direct observation, picture based mcqs': 'Written, Tutorial, Case based discussion, OSCE, Direct observation, Picture based MCQ',
  'written, tutorials, case based discussion, prescription writing': 'Written, Tutorial, Case based discussion, Prescription writing',
  // Written + Viva voce compound
  'written/ viva voce / doap': 'Written, Viva voce, DOAP',
  'written/ viva voce / direct observation': 'Written, Viva voce, Direct observation',
  'written/ viva voce / ospe / case studies interpretation': 'Written, Viva voce, OSPE',
  'written/ viva voce / ospe (ldl calculate)': 'Written, Viva voce, OSPE',
  'written/ viva voce / tutorial /ospe/ direct observation': 'Written, Viva voce, Tutorial, OSPE, Direct observation',
  'written/ viva voce /skill assessment': 'Written, Viva voce, Skill assessment',
  'written/ viva voce /tutorial': 'Written, Viva voce, Tutorial',
  'written/ viva voce direct observation/ ospe': 'Written, Viva voce, Direct observation, OSPE',
  'written/ viva voce logbook record': 'Written, Viva voce, Logbook',
  'written/ viva voce osce': 'Written, Viva voce, OSCE',
  'written/ viva voce ospe': 'Written, Viva voce, OSPE',
  'written/ viva voce, direct observation, ospe': 'Written, Viva voce, Direct observation, OSPE',
  'written/ viva voce, osce': 'Written, Viva voce, OSCE',
  'written/ viva voce, direct observation': 'Written, Viva voce, Direct observation',
  'written/ viva voce, prescription audit': 'Written, Viva voce, Prescription writing',
  'written/ viva voce/ case studies /ospe': 'Written, Viva voce, OSPE',
  'written/ viva voce/ direct observation /o spe': 'Written, Viva voce, Direct observation, OSPE',
  'written/ viva voce/ direct observation/ ospe': 'Written, Viva voce, Direct observation, OSPE',
  'written/ viva voce/ direct observations, audit of prescriptions': 'Written, Viva voce, Direct observation, Prescription writing',
  'written/ viva voce/ osce/ospe': 'Written, Viva voce, OSCE, OSPE',
  'written/ viva voce/ ospe': 'Written, Viva voce, OSPE',
  'written/ viva voce/ ospe /direct observation/ case studies interpretation.': 'Written, Viva voce, OSPE, Direct observation',
  'written/ viva voce/ ospe/ direct observation, prescription audit': 'Written, Viva voce, OSPE, Direct observation, Prescription writing',
  'written/ viva voce/ ospe/ direct observation/ ospe': 'Written, Viva voce, OSPE, Direct observation',
  'written/ viva voce/ skill assessment': 'Written, Viva voce, Skill assessment',
  'written/ viva voce/ skills assessment': 'Written, Viva voce, Skill assessment',
  'written/ viva voce/ tutorial': 'Written, Viva voce, Tutorial',
  'written/ viva voce/ tutorial, prescription audit': 'Written, Viva voce, Tutorial, Prescription writing',
  'written/ viva voce/ tutorial, prescription audit': 'Written, Viva voce, Tutorial, Prescription writing',
  'written/ viva voce/ direct observation/ prescription audit': 'Written, Viva voce, Direct observation, Prescription writing',
  'written/ viva voce/ prescription audit': 'Written, Viva voce, Prescription writing',
  'written/ viva voce/ skill': 'Written, Viva voce, Skill assessment',
  'written/ viva voce/ skill assessment': 'Written, Viva voce, Skill assessment',
  'written/ viva voce/ skills assessment': 'Written, Viva voce, Skill assessment',
  'written/ viva voce/direct observation': 'Written, Viva voce, Direct observation',
  'written/ viva voce/mcq': 'Written, Viva voce, MCQ',
  'written/ viva voce/osce': 'Written, Viva voce, OSCE',
  'written/ viva voce/ospe': 'Written, Viva voce, OSPE',
  'written/ viva voce/skill assessment': 'Written, Viva voce, Skill assessment',
  'written/ viva voce/tutorial': 'Written, Viva voce, Tutorial',
  'written/ viva voce/tutorial prescription audit/ direct observations': 'Written, Viva voce, Tutorial, Prescription writing, Direct observation',
  'written/ viva voce/tutorial, ospe': 'Written, Viva voce, Tutorial, OSPE',
  'written/ viva voce/tutorial, prescription audit': 'Written, Viva voce, Tutorial, Prescription writing',
  'written/ viva voce/tutorial/ direct observation': 'Written, Viva voce, Tutorial, Direct observation',
  'written/ viva voce/tutorial/ ospe': 'Written, Viva voce, Tutorial, OSPE',
  'written/ viva voce/application based questions': 'Written, Viva voce, Application based question',
  'written/ viva voce/skills assessment': 'Written, Viva voce, Skill assessment',
  'written/ viva voce/tutorial': 'Written, Viva voce, Tutorial',
  'written/ viva voce/tutorial prescription audit': 'Written, Viva voce, Tutorial, Prescription writing',
  'written/ viva voce/tutorial, direct observation, ospe': 'Written, Viva voce, Tutorial, Direct observation, OSPE',
  'written/ viva voce/tutorial, ospe': 'Written, Viva voce, Tutorial, OSPE',
  'written/ viva voce/tutorial, pandemic module': 'Written, Viva voce, Tutorial',
  'written/ viva voce/tutorial, prescription audit': 'Written, Viva voce, Tutorial, Prescription writing',
  'written/ viva voce/tutorial, direct observations': 'Written, Viva voce, Tutorial, Direct observation',
  'written/ viva/ tutorial/ osce': 'Written, Viva voce, Tutorial, OSCE',
  'written/ mcq / viva voce': 'Written, MCQ, Viva voce',
  'written/ skill assessment': 'Written, Skill assessment',
  'written/ skill assessment/ viva voce': 'Written, Skill assessment, Viva voce',
  'written/ tutorial': 'Written, Tutorial',
  'written/ tutorial, prescription audit': 'Written, Tutorial, Prescription writing',
  'written/ viva': 'Written, Viva voce',
  'written/ viva voce': 'Written, Viva voce',
  'written/skill assessment': 'Written, Skill assessment',
  'written/skill assessment /osce': 'Written, Skill assessment, OSCE',
  'written/skill assessment, osce': 'Written, Skill assessment, OSCE',
  'written/skill station': 'Written, Skill lab',
  'written/mcq / viva voce': 'Written, MCQ, Viva voce',
  'written/mcq, viva voce': 'Written, MCQ, Viva voce',
  'written, case based discussion': 'Written, Case based discussion',
  'written, case based discussion, osce': 'Written, Case based discussion, OSCE',
  'written, case based discussion, osce, prescription writing': 'Written, Case based discussion, OSCE, Prescription writing',
  'written, case based discussion, osce,picture based mcqs': 'Written, Case based discussion, OSCE, Picture based MCQ',
  'written, case based discussion, direct observation, prescription writing': 'Written, Case based discussion, Direct observation, Prescription writing',
  'written, viva voce, case based discussion': 'Written, Viva voce, Case based discussion',
  'written, ospe, viva voce/tutorial': 'Written, OSPE, Viva voce, Tutorial',
  'written/viva voce/ osce': 'Written, Viva voce, OSCE',
  'written/viva voce/ skill assessment': 'Written, Viva voce, Skill assessment',
  'written/viva voce/ clinical assessment': 'Written, Viva voce, Clinical assessment',
  'written/viva voce/ case studies/ospe': 'Written, Viva voce, OSPE',
  'written/viva voce/ direct observation': 'Written, Viva voce, Direct observation',
  'written/viva voce/assignments': 'Written, Viva voce',
  'written/viva voce/case studies/ospe': 'Written, Viva voce, OSPE',
  'written/viva voce/direct observation/ ospe': 'Written, Viva voce, Direct observation, OSPE',
  'written/viva voce/osce': 'Written, Viva voce, OSCE',
  'written/viva voce/osce (question station)': 'Written, Viva voce, OSCE',
  'written/viva voce/skill assessment': 'Written, Viva voce, Skill assessment',
  'written/viva voce/tutorial, ospe/ prescription audit, direct observation': 'Written, Viva voce, Tutorial, OSPE, Prescription writing, Direct observation',
  'written/viva voce/tutorial, prescription': 'Written, Viva voce, Tutorial, Prescription writing',
  'written/viva voce/tutorial, prescription audit': 'Written, Viva voce, Tutorial, Prescription writing',
  'written /viva voce/ospe (question station)': 'Written, Viva voce, OSPE',
  // Theory compound
  'theory/ clinical assessment/ viva voce': 'Written, Clinical assessment, Viva voce',
  'theory/ practical / orals/written/vi va voce': 'Written, Practical, Viva voce',
  // Short note compound
  'short note/ viva voce': 'Written, Viva voce', 'short note/ viva voice': 'Written, Viva voce',
  'short note/viva': 'Written, Viva voce', 'short note/viva voice': 'Written, Viva voce',
  'short note/vivavoice': 'Written, Viva voce',
  'short note/ viva voce/tutorial': 'Written, Viva voce, Tutorial',
  // OSCE compound
  'osce/viva voce': 'OSCE, Viva voce', 'osce/ viva voce': 'OSCE, Viva voce',
  'ospe/viva voce': 'OSPE, Viva voce',
  'viva voce/ osce': 'Viva voce, OSCE', 'viva voce/osce': 'Viva voce, OSCE',
  'viva voce / ospe': 'Viva voce, OSPE',
  // LGT compound assessment
  'lgt, sgt': 'LGT, SGT', 'lgt,sgt': 'LGT, SGT',
  'lgt, sgt/ practicals / seminars': 'LGT, SGT, Practical',
  'lgt, small group discussion/ bed side clinic': 'LGT, SGT, Bedside clinic',
  'lgt,sgt, bedside clinic': 'LGT, SGT, Bedside clinic',
  'lgt,sgt, case discussion': 'LGT, SGT, Case discussion',
  'lgt,sgt, doap': 'LGT, SGT, DOAP',
  'lgt,sgt,case discussion': 'LGT, SGT, Case discussion',
  'lgt,sgt,doap': 'LGT, SGT, DOAP',
  'lgt,sgt,video assistedlecture': 'LGT, SGT',
  // Written / clinical assessment
  'written/ clinicalassessme nt': 'Written, Clinical assessment',
  'written/clinical assessment/viva voce': 'Written, Clinical assessment, Viva voce',
  // Misc
  'written': 'Written',
};

// ─── NORMALIZATION LOGIC ─────────────────────────────────────────────────────

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalizeColumn(value: string, map: Record<string, string>, column: string): string {
  if (!value || !value.trim()) return value;

  let cleaned = value.trim();
  // Remove trailing/leading punctuation
  cleaned = cleaned.replace(/^[.,/\-–]+|[.,/\-–]+$/g, '').trim();

  if (!cleaned) return '';

  const lower = cleaned.toLowerCase();

  // Try exact match on the whole value first
  if (map[lower] !== undefined) {
    return map[lower];
  }

  // Try splitting on comma/slash while protecting multi-word terms
  // Use comma as primary separator, then try slash
  const parts = splitOnSeparators(cleaned);

  const normalized: string[] = [];
  for (const part of parts) {
    let p = part.trim();
    // Remove trailing/leading punctuation
    p = p.replace(/^[.,/\-–]+|[.,/\-–]+$/g, '').trim();
    if (!p) continue;

    const pLower = p.toLowerCase();

    if (map[pLower] !== undefined) {
      const mapped = map[pLower];
      if (mapped) {
        // May contain commas (compound mapping)
        for (const m of mapped.split(', ')) {
          if (!normalized.includes(m)) normalized.push(m);
        }
      }
      continue;
    }

    // Try startsWith for close matches (only if fragment is longer than key)
    let found = false;
    for (const [key, canonical] of Object.entries(map)) {
      if (pLower.startsWith(key) && pLower.length <= key.length + 3 && key.length >= 3) {
        if (canonical) {
          for (const m of canonical.split(', ')) {
            if (!normalized.includes(m)) normalized.push(m);
          }
        }
        found = true;
        break;
      }
    }

    if (!found) {
      console.warn(`  [WARN] Unmatched ${column}: "${p}"`);
      const capitalized = p.charAt(0).toUpperCase() + p.slice(1);
      if (!normalized.includes(capitalized)) normalized.push(capitalized);
    }
  }

  return normalized.join(', ');
}

function splitOnSeparators(value: string): string[] {
  // Protected multi-word terms that should not be split on comma or slash
  const protectedTerms = [
    'viva voce', 'viva voice', 'viva- voce', 'vova voce', 'vivavoce', 'vivavoice',
    'skill assessment', 'skills assessment', 'skillassessment', 'skillsassessment',
    'sill assessment',
    'bedside clinic', 'bedside clinics', 'bedsideclinic', 'bedsideclinics',
    'bed side clinic', 'bed side clinics', 'bedside teaching', 'bed side teaching',
    'skill lab', 'skills lab', 'skillslab', 'skilllab',
    'skill station', 'skills station', 'skillsstation', 'skillstation',
    'role play', 'role-play', 'role plays',
    'flipped classroom', 'flipped class room', 'flippedclassroom',
    'small group discussion', 'small group teaching',
    'case based discussion', 'case-based discussion', 'case discussion',
    'case based exercise', 'case based exercises', 'cased based exercises',
    'application based question', 'application based questions', 'application based',
    'long case', 'short case', 'long/short case',
    'clinical demonstration', 'clinical assessment', 'clinical case based exercises',
    'direct observation', 'case based mcq', 'picture based mcqs',
    'scenario based questions', 'case-based questions',
    'prescription writing', 'prescription audit', 'prescription critique',
    'interpretational exercise', 'interpretational exercises',
    'short notes', 'short note', 'short answer',
    'practical exercise', 'practical exercises',
    'log book', 'document in logbook', 'document in log book',
    'documentation in logbook', 'documentation in',
    'written assessment', 'written examination',
    'video demo.', 'video demo', 'video demonstration', 'video assisted',
    'fap clinical posting', 'fapclinicalposting',
    'standardized patients', 'standardizedpatients',
    'self assessment', 'sgt activity', 'doap session',
    'student seminar', 'student seminars',
    'panel discussion', 'field visit', 'home assignment',
    'vi va voce', 'viva voce',
  ].sort((a, b) => b.length - a.length);

  let working = value;
  const placeholders: string[] = [];

  for (const term of protectedTerms) {
    const regex = new RegExp(escapeRegex(term), 'gi');
    working = working.replace(regex, (match) => {
      const idx = placeholders.length;
      placeholders.push(match);
      return `\x00PH${idx}\x00`;
    });
  }

  // Split on comma or slash
  const parts = working.split(/[,/]+/).map(s => s.trim()).filter(Boolean);

  // Restore placeholders
  return parts.map(part => {
    return part.replace(/\x00PH(\d+)\x00/g, (_, idx) => placeholders[parseInt(idx)]);
  });
}

// ─── MAIN ────────────────────────────────────────────────────────────────────

function main() {
  console.log(`Mode: ${applyMode ? 'APPLY' : 'PREVIEW (dry run)'}\n`);

  // --- Teaching methods ---
  const teachingRows = db.prepare(
    'SELECT id, teaching_methods FROM competencies WHERE teaching_methods IS NOT NULL'
  ).all() as { id: number; teaching_methods: string }[];

  console.log('=== TEACHING METHODS ===\n');
  const teachingDistinctBefore = new Set(teachingRows.map(r => r.teaching_methods));
  console.log(`Distinct values before: ${teachingDistinctBefore.size}\n`);

  const teachingChanges: { id: number; before: string; after: string }[] = [];
  for (const row of teachingRows) {
    const normalized = normalizeColumn(row.teaching_methods, teachingMap, 'teaching');
    if (normalized !== row.teaching_methods) {
      teachingChanges.push({ id: row.id, before: row.teaching_methods, after: normalized });
    }
  }

  const teachingTransforms = new Map<string, string>();
  for (const c of teachingChanges) teachingTransforms.set(c.before, c.after);
  for (const [before, after] of [...teachingTransforms.entries()].sort())
    console.log(`  "${before}" → "${after}"`);
  console.log(`\nTeaching: ${teachingChanges.length} rows changed (${teachingTransforms.size} unique transforms)\n`);

  // --- Assessment methods ---
  const assessmentRows = db.prepare(
    'SELECT id, assessment_methods FROM competencies WHERE assessment_methods IS NOT NULL'
  ).all() as { id: number; assessment_methods: string }[];

  console.log('=== ASSESSMENT METHODS ===\n');
  const assessmentDistinctBefore = new Set(assessmentRows.map(r => r.assessment_methods));
  console.log(`Distinct values before: ${assessmentDistinctBefore.size}\n`);

  const assessmentChanges: { id: number; before: string; after: string }[] = [];
  for (const row of assessmentRows) {
    const normalized = normalizeColumn(row.assessment_methods, assessmentMap, 'assessment');
    if (normalized !== row.assessment_methods) {
      assessmentChanges.push({ id: row.id, before: row.assessment_methods, after: normalized });
    }
  }

  const assessmentTransforms = new Map<string, string>();
  for (const c of assessmentChanges) assessmentTransforms.set(c.before, c.after);
  for (const [before, after] of [...assessmentTransforms.entries()].sort())
    console.log(`  "${before}" → "${after}"`);
  console.log(`\nAssessment: ${assessmentChanges.length} rows changed (${assessmentTransforms.size} unique transforms)\n`);

  // --- Apply ---
  if (applyMode) {
    console.log('Applying changes in a transaction...\n');
    const updateTeaching = db.prepare('UPDATE competencies SET teaching_methods = ? WHERE id = ?');
    const updateAssessment = db.prepare('UPDATE competencies SET assessment_methods = ? WHERE id = ?');

    db.transaction(() => {
      for (const c of teachingChanges) updateTeaching.run(c.after, c.id);
      for (const c of assessmentChanges) updateAssessment.run(c.after, c.id);
    })();

    console.log(`Applied ${teachingChanges.length} teaching + ${assessmentChanges.length} assessment changes.\n`);

    const distinctTeaching = db.prepare('SELECT DISTINCT teaching_methods FROM competencies WHERE teaching_methods IS NOT NULL ORDER BY teaching_methods').all() as { teaching_methods: string }[];
    console.log(`=== RESULTING DISTINCT TEACHING METHODS (${distinctTeaching.length}) ===`);
    for (const r of distinctTeaching) console.log(`  "${r.teaching_methods}"`);

    console.log();

    const distinctAssessment = db.prepare('SELECT DISTINCT assessment_methods FROM competencies WHERE assessment_methods IS NOT NULL ORDER BY assessment_methods').all() as { assessment_methods: string }[];
    console.log(`=== RESULTING DISTINCT ASSESSMENT METHODS (${distinctAssessment.length}) ===`);
    for (const r of distinctAssessment) console.log(`  "${r.assessment_methods}"`);
  } else {
    console.log('Run with --apply to apply these changes.');
  }
}

main();
db.close();
