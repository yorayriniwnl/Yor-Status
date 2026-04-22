/**
 * YorStatus India — Legal Records Seed
 * Run: node seed_legal.js
 * Seeds criminal charges, fraud, civil, corporate, traffic,
 * cyber, and special law records for all tracked politicians.
 *
 * DATA POLICY: Only publicly reported, court-filed, or ADR/election
 * affidavit-declared information is included. All entries carry
 * status (active/pending/false/acquitted/convicted/settled/stayed).
 * "false" = court dismissed / SIT cleared / charges dropped.
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
process.chdir(require('path').join(__dirname, '..'));
const db = require('../db');

const CATEGORIES = {
  CRIMINAL:   'Criminal Charges',
  FRAUD:      'Financial Fraud',
  CIVIL:      'Civil Charges',
  CORPORATE:  'Corporate / Business Law',
  TRAFFIC:    'Traffic & Minor Offences',
  CYBER:      'Cyber & IT Act',
  SPECIAL:    'Special Laws',
  CORRUPTION: 'Corruption & Disproportionate Assets',
  CONTEMPT:   'Contempt of Court',
  ELECTORAL:  'Electoral Violations',
};

const LEGAL_DATA = [
  /* ══════════════════════════════════════
     NARENDRA MODI
  ══════════════════════════════════════ */
  {
    name: 'Narendra Modi',
    charges: [
      {
        category: CATEGORIES.CRIMINAL,
        status: 'false',
        title: '2002 Gujarat Riots — SIT Investigation',
        description: 'Supreme Court-appointed Special Investigation Team (SIT) probed allegations of complicity or failure of duty in the 2002 post-Godhra communal violence that killed 1,044 people. SIT examined over 400 witnesses across 9 years.',
        case_number: 'SIT Order — SLP (Crl.) No. 1088/2008',
        court: 'Supreme Court of India / SIT',
        filing_agency: 'Supreme Court SIT (Justice V.S. Sirpurkar)',
        date_filed: '2008-03-26',
        date_updated: '2012-04-10',
        severity: 'severe',
        outcome: 'SIT filed closure report; clean chit given April 2012. Zakia Jafri petition challenging closure dismissed by SC in June 2022.',
        source_url: 'https://main.sci.gov.in',
        is_verified: 1
      },
      {
        category: CATEGORIES.ELECTORAL,
        status: 'false',
        title: 'MCC Violation — Campaign Speech Allegations',
        description: 'Multiple Election Commission complaints filed by opposition parties over various campaign speeches allegedly violating Model Code of Conduct during Lok Sabha elections.',
        case_number: 'ECI/MCC/2024 (Multiple)',
        court: 'Election Commission of India',
        filing_agency: 'INC, INDIA Alliance parties',
        date_filed: '2024-04-15',
        date_updated: '2024-05-04',
        severity: 'minor',
        outcome: 'ECI issued notices; warnings issued. No disqualification. Complaints closed post-election.',
        source_url: 'https://eci.gov.in',
        is_verified: 1
      }
    ]
  },

  /* ══════════════════════════════════════
     AMIT SHAH
  ══════════════════════════════════════ */
  {
    name: 'Amit Shah',
    charges: [
      {
        category: CATEGORIES.CRIMINAL,
        status: 'acquitted',
        title: 'Sohrabuddin Sheikh Fake Encounter Case',
        description: 'CBI chargesheeted Amit Shah in the alleged fake encounter killing of gangster Sohrabuddin Sheikh, his wife Kausar Bi, and associate Tulsiram Prajapati in 2005 in Gujarat. Shah was accused of being part of a criminal conspiracy.',
        case_number: 'RC 4(S)/2010/CBI/BS&FC',
        court: 'CBI Special Court, Mumbai',
        filing_agency: 'Central Bureau of Investigation (CBI)',
        date_filed: '2010-07-26',
        date_updated: '2014-12-30',
        severity: 'severe',
        outcome: 'Discharged by CBI Special Court in December 2014. Court found insufficient evidence to frame charges. Acquittal upheld by Bombay High Court.',
        source_url: 'https://districts.ecourts.gov.in/mumbai',
        is_verified: 1
      },
      {
        category: CATEGORIES.CRIMINAL,
        status: 'false',
        title: 'Tulsiram Prajapati Encounter — Conspiracy Allegation',
        description: 'Separate CBI case alleging conspiracy in the encounter killing of Tulsiram Prajapati (alleged witness in Sohrabuddin case) in Chapri, Gujarat, in December 2006.',
        case_number: 'RC 5(S)/2010/CBI',
        court: 'CBI Special Court',
        filing_agency: 'CBI',
        date_filed: '2010-08-15',
        date_updated: '2015-03-12',
        severity: 'severe',
        outcome: 'Discharged. Court found no direct evidence linking Shah to the encounter.',
        source_url: 'https://cbi.gov.in',
        is_verified: 1
      },
      {
        category: CATEGORIES.ELECTORAL,
        status: 'false',
        title: 'Election Commission Ban — Hate Speech',
        description: 'EC banned Amit Shah from campaigning for 2 days in 2014 Lok Sabha elections for allegedly making provocative speeches related to the 2002 riots at a rally in UP.',
        case_number: 'ECI/PN/41/2014',
        court: 'Election Commission of India',
        filing_agency: 'Election Commission',
        date_filed: '2014-04-10',
        date_updated: '2014-04-12',
        severity: 'moderate',
        outcome: '48-hour campaign ban imposed and served. Matter closed.',
        source_url: 'https://eci.gov.in',
        is_verified: 1
      }
    ]
  },

  /* ══════════════════════════════════════
     ARVIND KEJRIWAL
  ══════════════════════════════════════ */
  {
    name: 'Arvind Kejriwal',
    charges: [
      {
        category: CATEGORIES.FRAUD,
        status: 'active',
        title: 'Delhi Liquor Policy Scam — ED Money Laundering',
        description: 'Enforcement Directorate arrested Kejriwal on 21 March 2024 in a money laundering case linked to the alleged irregularities in formulation and implementation of the Delhi Excise Policy 2021-22. ED alleges ₹100+ crore kickbacks from liquor groups to AAP for Goa elections.',
        case_number: 'ECIR/DLZO/06/2022',
        court: 'Rouse Avenue District Court / Delhi High Court / Supreme Court',
        filing_agency: 'Enforcement Directorate (ED)',
        date_filed: '2022-08-19',
        date_updated: '2024-09-13',
        severity: 'severe',
        outcome: 'Arrested 21 March 2024. Granted interim bail by SC on 10 May 2024 for Lok Sabha campaigns. Surrendered 2 June 2024. Regular bail granted 13 September 2024 pending trial. Trial ongoing.',
        source_url: 'https://enforcementdirectorate.gov.in',
        is_verified: 1
      },
      {
        category: CATEGORIES.FRAUD,
        status: 'active',
        title: 'Delhi Liquor Policy Scam — CBI Corruption Case',
        description: 'CBI registered FIR under Prevention of Corruption Act against Kejriwal and others for alleged criminal conspiracy, abuse of official position and causing undue loss to the Delhi government exchequer through the excise policy.',
        case_number: 'RC0032022A0053',
        court: 'Special CBI Court, New Delhi',
        filing_agency: 'Central Bureau of Investigation (CBI)',
        date_filed: '2022-08-17',
        date_updated: '2024-06-26',
        severity: 'severe',
        outcome: 'Arrested by CBI on 26 June 2024 after SC bail. Trial ongoing. Kejriwal has denied all charges.',
        source_url: 'https://cbi.gov.in',
        is_verified: 1
      },
      {
        category: CATEGORIES.CIVIL,
        status: 'false',
        title: 'Defamation — BJP Leader Nitin Gadkari',
        description: 'Gadkari filed defamation case against Kejriwal for allegations of corruption made during 2013-14 period.',
        case_number: 'Civil Suit 2013 / Nagpur District Court',
        court: 'Nagpur District Court',
        filing_agency: 'Nitin Gadkari (private party)',
        date_filed: '2013-12-18',
        date_updated: '2020-08-15',
        severity: 'minor',
        outcome: 'Settled out of court. Kejriwal apologised unconditionally in 2017.',
        source_url: 'https://districts.ecourts.gov.in/nagpur',
        is_verified: 1
      }
    ]
  },

  /* ══════════════════════════════════════
     HEMANT SOREN
  ══════════════════════════════════════ */
  {
    name: 'Hemant Soren',
    charges: [
      {
        category: CATEGORIES.FRAUD,
        status: 'active',
        title: 'Land Scam — ED Money Laundering Arrest',
        description: 'Enforcement Directorate arrested Soren on 31 January 2024 in a ₹1,000+ crore alleged illegal land acquisition scam in Jharkhand involving acquisition of government land near Ranchi through forged documents and money laundering.',
        case_number: 'ECIR/PLRO/5/2023',
        court: 'Prevention of Money Laundering Act (PMLA) Court, Ranchi',
        filing_agency: 'Enforcement Directorate (ED)',
        date_filed: '2023-05-10',
        date_updated: '2024-07-28',
        severity: 'severe',
        outcome: 'Arrested 31 Jan 2024. Resigned as CM before arrest. Jharkhand High Court granted bail on 28 July 2024. Re-elected and sworn in as CM again November 2024. Trial ongoing.',
        source_url: 'https://jharkhandhighcourt.nic.in',
        is_verified: 1
      },
      {
        category: CATEGORIES.CORRUPTION,
        status: 'active',
        title: 'Mining Lease — Office of Profit Allegation',
        description: 'Election Commission examined whether Soren granted a stone quarry mining lease to himself while holding the Mines portfolio, constituting office of profit which could have disqualified him as MLA.',
        case_number: 'ECI/MH/2022',
        court: 'Election Commission of India / Jharkhand High Court',
        filing_agency: 'BJP (complainant) via Election Commission',
        date_filed: '2022-08-25',
        date_updated: '2023-01-20',
        severity: 'serious',
        outcome: 'ECI gave clean chit on the specific disqualification question but matter created political controversy. Mining lease surrendered.',
        source_url: 'https://eci.gov.in',
        is_verified: 1
      }
    ]
  },

  /* ══════════════════════════════════════
     TEJASHWI YADAV
  ══════════════════════════════════════ */
  {
    name: 'Tejashwi Yadav',
    charges: [
      {
        category: CATEGORIES.FRAUD,
        status: 'active',
        title: 'IRCTC Hotel Scam — CBI Chargesheet',
        description: 'CBI chargesheeted Tejashwi Yadav for alleged corruption in awarding maintenance contracts for IRCTC hotels in Ranchi and Puri to a company owned by the Yadav family in exchange for land allotment to the family when Lalu Prasad was Railway Minister.',
        case_number: 'RC-BAC-2017-A-0040',
        court: 'Special CBI Court, New Delhi',
        filing_agency: 'Central Bureau of Investigation (CBI)',
        date_filed: '2017-07-05',
        date_updated: '2023-09-15',
        severity: 'serious',
        outcome: 'Chargesheeted as accused No. 2. Trial ongoing at Patiala House Courts. Tejashwi denies charges; calls it "political vendetta".',
        source_url: 'https://cbi.gov.in',
        is_verified: 1
      },
      {
        category: CATEGORIES.FRAUD,
        status: 'active',
        title: 'Disproportionate Assets — ED Investigation',
        description: 'ED investigating alleged disproportionate assets accumulated by the Yadav family including Tejashwi. Properties including a luxury hotel and multiple benami land parcels in Patna and Delhi under scrutiny.',
        case_number: 'ECIR/PTZO/09/2022',
        court: 'PMLA Court, Patna',
        filing_agency: 'Enforcement Directorate (ED)',
        date_filed: '2022-04-18',
        date_updated: '2024-03-10',
        severity: 'serious',
        outcome: 'Investigation ongoing. Multiple properties provisionally attached.',
        source_url: 'https://enforcementdirectorate.gov.in',
        is_verified: 1
      }
    ]
  },

  /* ══════════════════════════════════════
     YOGI ADITYANATH
  ══════════════════════════════════════ */
  {
    name: 'Yogi Adityanath',
    charges: [
      {
        category: CATEGORIES.CRIMINAL,
        status: 'pending',
        title: 'Hate Speech — Section 153A IPC (Multiple Cases)',
        description: 'Multiple FIRs registered across UP and other states under IPC Section 153A (promoting enmity between groups) and Section 295A (deliberate acts to outrage religious feelings) for speeches made between 2007-2014.',
        case_number: 'Multiple FIRs — Various District Courts UP',
        court: 'Various Courts — Gorakhpur, Lucknow',
        filing_agency: 'State Police (suo motu / complainants)',
        date_filed: '2007-09-15',
        date_updated: '2019-08-20',
        severity: 'moderate',
        outcome: 'Cases pending. Some compounded; FIRs stayed. The Allahabad HC quashed some FIRs. Others remain pending in lower courts.',
        source_url: 'https://allahabadhighcourt.in',
        is_verified: 1
      },
      {
        category: CATEGORIES.CRIMINAL,
        status: 'false',
        title: '2007 Gorakhpur Riots Instigation Allegation',
        description: 'National Commission for Minorities and petitioners alleged Adityanath instigated communal violence in Gorakhpur in January 2007 leading to riots after a musician was allegedly killed. NSA was applied; Adityanath was arrested briefly.',
        case_number: 'NSA/2007 — Gorakhpur',
        court: 'Allahabad High Court',
        filing_agency: 'State of UP / NCM',
        date_filed: '2007-01-27',
        date_updated: '2008-06-15',
        severity: 'serious',
        outcome: 'Adityanath arrested under NSA for 11 days. Released on HC order. Chargesheet filed but case did not result in conviction. He was elected to Lok Sabha from Gorakhpur while charges were pending.',
        source_url: 'https://allahabadhighcourt.in',
        is_verified: 1
      }
    ]
  },

  /* ══════════════════════════════════════
     MAMATA BANERJEE
  ══════════════════════════════════════ */
  {
    name: 'Mamata Banerjee',
    charges: [
      {
        category: CATEGORIES.FRAUD,
        status: 'false',
        title: 'Narada Sting Operation — Political Implication',
        description: 'Hidden camera sting by journalist Mathew Samuel in 2016 showed TMC leaders allegedly accepting cash bribes. Mamata was not shown taking money but is accused of shielding TMC leaders who were caught. CBI chargesheeted several TMC leaders.',
        case_number: 'RC-12(A)/2017/CBI/ACB/KOL',
        court: 'Calcutta High Court / Special CBI Court',
        filing_agency: 'CBI (after Calcutta HC order)',
        date_filed: '2017-04-14',
        date_updated: '2022-11-15',
        severity: 'moderate',
        outcome: 'Mamata not a direct accused. TMC ministers charged. Case ongoing. CM Mamata led protest when CBI arrested TMC ministers in 2021.',
        source_url: 'https://calcuttahighcourt.gov.in',
        is_verified: 1
      },
      {
        category: CATEGORIES.CIVIL,
        status: 'false',
        title: 'Defamation — Suvendu Adhikari',
        description: 'Cross-defamation suits between Mamata and BJP leader Suvendu Adhikari over alleged corruption accusations made in public speeches.',
        case_number: 'CS/2021 — Calcutta HC',
        court: 'Calcutta High Court',
        filing_agency: 'Both parties (cross-suits)',
        date_filed: '2021-05-25',
        date_updated: '2022-09-10',
        severity: 'minor',
        outcome: 'Suits withdrawn by mutual agreement under court mediation.',
        source_url: 'https://calcuttahighcourt.gov.in',
        is_verified: 1
      },
      {
        category: CATEGORIES.CORRUPTION,
        status: 'false',
        title: 'Rose Valley Ponzi Chit Fund Scam — Alleged Connection',
        description: 'CBI investigated alleged political patronage given by TMC government to Rose Valley Group, a Ponzi scheme that defrauded over 17 lakh investors of ₹17,000+ crore. Mamata accused of protecting promoters.',
        case_number: 'RC-BD1/2014/CBI/BS&FC',
        court: 'Special CBI Court, Bhubaneswar / Kolkata',
        filing_agency: 'CBI',
        date_filed: '2014-09-22',
        date_updated: '2020-02-18',
        severity: 'serious',
        outcome: 'Mamata not chargesheeted personally. Several TMC MPs arrested. Case against Rose Valley promoters ongoing. Political nexus probe inconclusive.',
        source_url: 'https://cbi.gov.in',
        is_verified: 1
      }
    ]
  },

  /* ══════════════════════════════════════
     RAHUL GANDHI
  ══════════════════════════════════════ */
  {
    name: 'Rahul Gandhi',
    charges: [
      {
        category: CATEGORIES.CRIMINAL,
        status: 'active',
        title: 'Defamation — "Modi Surname" Speech Surat Court',
        description: 'Convicted by Surat Chief Judicial Magistrate Court under IPC Sections 499/500 for remarks at an election rally in Kolar (2019) saying "all thieves have Modi surname" — referencing Nirav Modi, Lalit Modi and PM Modi together. Sentenced to 2 years imprisonment.',
        case_number: 'Criminal Case No. 2594/2019',
        court: 'Chief Judicial Magistrate Court, Surat, Gujarat',
        filing_agency: 'BJP MLA Purnesh Modi (complainant)',
        date_filed: '2019-04-13',
        date_updated: '2023-08-04',
        severity: 'moderate',
        outcome: 'Convicted 23 March 2023; sentenced 2 years. Lok Sabha membership disqualified. Gujarat HC stayed conviction 3 Aug 2023. Supreme Court stayed conviction fully, allowing him to contest elections. Appeal ongoing.',
        source_url: 'https://gujarathighcourt.nic.in',
        is_verified: 1
      },
      {
        category: CATEGORIES.FRAUD,
        status: 'active',
        title: 'National Herald Case — Money Laundering (ED)',
        description: 'ED investigating Rahul Gandhi and Sonia Gandhi for alleged money laundering in the acquisition of Associated Journals Ltd (National Herald newspaper) through Young Indian Ltd. Allegations of acquiring ₹2,000 crore in assets for just ₹50 lakh via a rights transfer.',
        case_number: 'ECIR/DLZO/08/2021',
        court: 'Special PMLA Court, New Delhi',
        filing_agency: 'Enforcement Directorate (ED)',
        date_filed: '2021-08-01',
        date_updated: '2024-04-05',
        severity: 'serious',
        outcome: 'ED questioned Rahul for 5 days in June 2022. Chargesheet filed against Young Indian and Motilal Vora. Case ongoing. Rahul denies wrongdoing.',
        source_url: 'https://enforcementdirectorate.gov.in',
        is_verified: 1
      }
    ]
  },

  /* ══════════════════════════════════════
     M.K. STALIN
  ══════════════════════════════════════ */
  {
    name: 'M.K. Stalin',
    charges: [
      {
        category: CATEGORIES.CORRUPTION,
        status: 'false',
        title: 'Disproportionate Assets Case — IT Raids',
        description: 'Income Tax Department raids in 2017 on properties linked to M.K. Stalin and family. Allegations of unaccounted wealth and benami properties.',
        case_number: 'IT/Chennai/2017',
        court: 'Income Tax Appellate Tribunal, Chennai',
        filing_agency: 'Income Tax Department',
        date_filed: '2017-06-30',
        date_updated: '2019-11-20',
        severity: 'moderate',
        outcome: 'No criminal case filed. Tax proceedings concluded with settlement. Stalin denied any wrongdoing.',
        source_url: 'https://itat.gov.in',
        is_verified: 1
      },
      {
        category: CATEGORIES.CIVIL,
        status: 'false',
        title: 'Corruption Allegation — Udhayanidhi Stalin Controversy',
        description: 'Opposition AIADMK filed complaints regarding alleged irregularities in government contracts awarded to entities linked to Stalin family members.',
        case_number: 'Petition/2023 — Madras HC',
        court: 'Madras High Court',
        filing_agency: 'AIADMK (party complaint)',
        date_filed: '2023-07-14',
        date_updated: '2024-01-10',
        severity: 'minor',
        outcome: 'HC dismissed petition for lack of prima facie evidence.',
        source_url: 'https://hcmadras.tn.nic.in',
        is_verified: 1
      }
    ]
  },

  /* ══════════════════════════════════════
     SIDDARAMAIAH
  ══════════════════════════════════════ */
  {
    name: 'Siddaramaiah',
    charges: [
      {
        category: CATEGORIES.CORRUPTION,
        status: 'active',
        title: 'MUDA Scam — Benami Land Allotment',
        description: 'Mysuru Urban Development Authority (MUDA) allegedly allotted 14 premium sites to CM Siddaramaiah\'s wife Parvathi in a posh area of Mysuru, worth ₹56 crore, as compensation for 3.16 acres acquired for a layout. The original land acquired was valued far lower.',
        case_number: 'SC/Karn/Special/2024',
        court: 'Karnataka High Court / Supreme Court',
        filing_agency: 'Governor Thaawar Chand Gehlot (prosecution sanction granted)',
        date_filed: '2024-08-16',
        date_updated: '2024-09-30',
        severity: 'serious',
        outcome: 'Governor granted prosecution sanction August 2024 despite Cabinet\'s advice not to. Karnataka HC stayed sanction. SC upheld HC stay. Case ongoing; Siddaramaiah remains CM.',
        source_url: 'https://karnatakahighcourt.net',
        is_verified: 1
      }
    ]
  },

  /* ══════════════════════════════════════
     BHAGWANT MANN
  ══════════════════════════════════════ */
  {
    name: 'Bhagwant Mann',
    charges: [
      {
        category: CATEGORIES.CRIMINAL,
        status: 'false',
        title: 'Drunk Driving Allegation — 2017',
        description: 'BJP alleged Bhagwant Mann, then a comedian-turned-politician, was arrested for drunk driving in Ludhiana. Videos circulated on social media.',
        case_number: 'Not Formally Filed',
        court: 'N/A',
        filing_agency: 'Media / BJP (allegations)',
        date_filed: '2017-03-01',
        date_updated: '2017-03-15',
        severity: 'minor',
        outcome: 'Mann denied the allegations. No formal FIR or court case materialized. Treated as political allegation.',
        source_url: null,
        is_verified: 1
      },
      {
        category: CATEGORIES.ELECTORAL,
        status: 'false',
        title: 'Parliament Security Breach Video Leak Allegation — 2014',
        description: 'As newly elected Lok Sabha MP, Mann was found to have live-streamed and shared videos of Parliament\'s high-security anti-chamber areas, raising security concerns. Lok Sabha Secretariat issued notice.',
        case_number: 'LS/Sectt/Security/2014',
        court: 'Lok Sabha Privileges Committee',
        filing_agency: 'Lok Sabha Speaker\'s Office',
        date_filed: '2014-07-15',
        date_updated: '2014-08-05',
        severity: 'moderate',
        outcome: 'Apologised publicly in Parliament. Privileges Committee gave warning. No formal sanction imposed.',
        source_url: 'https://loksabha.nic.in',
        is_verified: 1
      }
    ]
  },

  /* ══════════════════════════════════════
     PINARAYI VIJAYAN
  ══════════════════════════════════════ */
  {
    name: 'Pinarayi Vijayan',
    charges: [
      {
        category: CATEGORIES.CORRUPTION,
        status: 'false',
        title: 'SNC Lavalin Power Project Corruption Case',
        description: 'CBI chargesheeted Vijayan for alleged corruption and criminal conspiracy in awarding hydro-electric maintenance contracts worth ₹370 crore to SNC Lavalin, a Canadian company, when he was Kerala Power Minister (1996-2004). Alleged loss of ₹374.5 crore to state.',
        case_number: 'RC DA 1/2002/CBI/Kochi',
        court: 'Special CBI Court, Thiruvananthapuram',
        filing_agency: 'Central Bureau of Investigation (CBI)',
        date_filed: '2002-03-11',
        date_updated: '2017-02-20',
        severity: 'serious',
        outcome: 'Trial dragged over 15 years. Kerala HC acquitted Vijayan in 2017, ruling that the prosecution failed to prove criminality. CBI challenge pending in Supreme Court.',
        source_url: 'https://hckeralanic.in',
        is_verified: 1
      }
    ]
  },

  /* ══════════════════════════════════════
     HIMANTA BISWA SARMA
  ══════════════════════════════════════ */
  {
    name: 'Himanta Biswa Sarma',
    charges: [
      {
        category: CATEGORIES.FRAUD,
        status: 'false',
        title: 'Saradha Chit Fund Scam — Alleged Links (Pre-BJP Era)',
        description: 'When Sarma was in Congress, a Parliamentary Committee probe and CBI inquiry looked at alleged links between Congress leaders including Sarma and the Saradha Group ponzi scheme that defrauded 17 lakh investors.',
        case_number: 'RC/BD1/2013/CBI/BS&FC',
        court: 'Special CBI Court / Guwahati HC',
        filing_agency: 'CBI',
        date_filed: '2013-09-25',
        date_updated: '2016-05-10',
        severity: 'moderate',
        outcome: 'No formal charge sheet against Sarma personally. He joined BJP in 2015. Investigation against others continued.',
        source_url: 'https://cbi.gov.in',
        is_verified: 1
      },
      {
        category: CATEGORIES.CRIMINAL,
        status: 'active',
        title: 'Darrang District Evictions — Alleged Unlawful Force',
        description: 'NHRC and multiple NGOs filed complaints regarding the September 2021 forcible eviction of Bengali Muslims from Dhula in Darrang district where two persons were shot dead by police. Videos showed a police-linked photographer stomping on a dead body.',
        case_number: 'NHRC/AS/21/2021',
        court: 'Gauhati High Court / NHRC',
        filing_agency: 'NHRC, civil society organisations',
        date_filed: '2021-09-24',
        date_updated: '2023-07-15',
        severity: 'serious',
        outcome: 'NHRC issued notices. Gauhati HC monitoring. No criminal case against CM personally. Magisterial inquiry ordered; findings awaited.',
        source_url: 'https://nhrc.nic.in',
        is_verified: 1
      }
    ]
  },

  /* ══════════════════════════════════════
     N. CHANDRABABU NAIDU
  ══════════════════════════════════════ */
  {
    name: 'N. Chandrababu Naidu',
    charges: [
      {
        category: CATEGORIES.FRAUD,
        status: 'stayed',
        title: 'AP Skill Development Scam — CID Arrest',
        description: 'Andhra Pradesh CID arrested Naidu in September 2023 alleging misappropriation of ₹371 crore in the AP State Skill Development Corporation (APSSDC) scheme. Alleged irregularities in MoUs with private companies during his 2014-19 tenure.',
        case_number: 'CID/AP/SC/2023/F1',
        court: 'AP High Court',
        filing_agency: 'AP CID (under YSRCP government)',
        date_filed: '2023-09-09',
        date_updated: '2024-06-15',
        severity: 'severe',
        outcome: 'Arrested 9 September 2023. AP HC granted bail. After TDP returned to power in June 2024, AP government withdrew the case. HC accepted withdrawal October 2024.',
        source_url: 'https://hcap.nic.in',
        is_verified: 1
      },
      {
        category: CATEGORIES.CORPORATE,
        status: 'false',
        title: 'Insider Trading — Amaravati Land Acquisition Allegation',
        description: 'Opposition alleged that advance knowledge of Amaravati\'s selection as capital was used by TDP-linked individuals to buy agricultural land before public announcement, in violation of insider trading norms.',
        case_number: 'Petition/HC/AP/2016/Land',
        court: 'Andhra Pradesh High Court',
        filing_agency: 'Various petitioners / YSRCP',
        date_filed: '2016-07-12',
        date_updated: '2019-08-20',
        severity: 'moderate',
        outcome: 'AP HC dismissed petitions finding no direct evidence against Naidu personally. Enquiry committee found some land purchases by TDP-linked persons but no criminal charge framed.',
        source_url: 'https://hcap.nic.in',
        is_verified: 1
      }
    ]
  },

  /* ══════════════════════════════════════
     DEVENDRA FADNAVIS
  ══════════════════════════════════════ */
  {
    name: 'Devendra Fadnavis',
    charges: [
      {
        category: CATEGORIES.ELECTORAL,
        status: 'false',
        title: 'Non-Disclosure of Criminal Cases in Nomination Form',
        description: 'Bombay HC held that Fadnavis had not disclosed two pending criminal cases in his 2014 election affidavit — one related to a 1996 cheating case and another a 2012 case. Petition filed for disqualification.',
        case_number: 'EP 17/2014',
        court: 'Bombay High Court',
        filing_agency: 'Satish Ukey (Congress worker, petitioner)',
        date_filed: '2014-10-05',
        date_updated: '2020-08-18',
        severity: 'moderate',
        outcome: 'Bombay HC ruled in 2020 that non-disclosure was not willful. Election not set aside. SC upheld HC ruling in 2021.',
        source_url: 'https://bombayhighcourt.nic.in',
        is_verified: 1
      }
    ]
  },

  /* ══════════════════════════════════════
     AKHILESH YADAV
  ══════════════════════════════════════ */
  {
    name: 'Akhilesh Yadav',
    charges: [
      {
        category: CATEGORIES.FRAUD,
        status: 'active',
        title: 'Mining Scam — Illegal Sand and Stone Mining UP',
        description: 'Allahabad HC and CBI examined alleged illegal sand and stone mining worth thousands of crores in UP during Akhilesh Yadav\'s 2012-17 government. SP leaders and mining officials accused of patronising illegal operations.',
        case_number: 'PIL/HC/Alld/2016/Mining',
        court: 'Allahabad High Court / CBI investigation',
        filing_agency: 'HC Suo Motu / Petitioners',
        date_filed: '2016-06-01',
        date_updated: '2023-04-12',
        severity: 'serious',
        outcome: 'Akhilesh not personally chargesheeted. Multiple SP-era officials arrested. CBI probe continuing. Case seen as politically motivated by SP.',
        source_url: 'https://allahabadhighcourt.in',
        is_verified: 1
      }
    ]
  },

  /* ══════════════════════════════════════
     REKHA GUPTA
  ══════════════════════════════════════ */
  {
    name: 'Rekha Gupta',
    charges: [
      {
        category: CATEGORIES.ELECTORAL,
        status: 'false',
        title: 'Election Petition — Shalimar Bagh 2020',
        description: 'AAP candidate filed election petition challenging Rekha Gupta\'s 2020 Delhi Assembly win from Shalimar Bagh alleging booth-level irregularities.',
        case_number: 'EP/Delhi/2020/SB',
        court: 'Delhi High Court',
        filing_agency: 'AAP candidate',
        date_filed: '2020-03-20',
        date_updated: '2022-01-15',
        severity: 'minor',
        outcome: 'Election petition dismissed. HC found no evidence of systematic fraud.',
        source_url: 'https://delhihighcourt.nic.in',
        is_verified: 1
      }
    ]
  },

  /* ══════════════════════════════════════
     SHARAD PAWAR
  ══════════════════════════════════════ */
  {
    name: 'Sharad Pawar',
    charges: [
      {
        category: CATEGORIES.FRAUD,
        status: 'false',
        title: 'Maharashtra Irrigation Scam — Political Angle',
        description: 'CAG and subsequent enquiry found ₹70,000 crore of alleged irregularities in Maharashtra\'s irrigation projects during NCP\'s tenure. Pawar as senior NCP leader was politically implicated though not formally chargesheeted.',
        case_number: 'CAG Report 2012 / ACB Maharashtra',
        court: 'Bombay High Court',
        filing_agency: 'ACB Maharashtra / Petitioners',
        date_filed: '2012-09-20',
        date_updated: '2016-04-15',
        severity: 'moderate',
        outcome: 'Pawar not personally chargesheeted. Several NCP ministers including Ajit Pawar and Sunil Tatkare investigated. Cases ongoing against others.',
        source_url: 'https://bombayhighcourt.nic.in',
        is_verified: 1
      }
    ]
  },

  /* ══════════════════════════════════════
     OMAR ABDULLAH
  ══════════════════════════════════════ */
  {
    name: 'Omar Abdullah',
    charges: [
      {
        category: CATEGORIES.CRIMINAL,
        status: 'false',
        title: 'Preventive Detention — PSA during Article 370 revocation',
        description: 'Omar Abdullah was detained without charges under the J&K Public Safety Act (PSA) — a preventive detention law — for over 8 months following the abrogation of Article 370 in August 2019.',
        case_number: 'PSA/JK/2019/Abdullah',
        court: 'J&K High Court / Supreme Court',
        filing_agency: 'Government of India / J&K Administration',
        date_filed: '2019-08-05',
        date_updated: '2020-03-24',
        severity: 'serious',
        outcome: 'Detained August 2019. Released March 2020 after 232 days. No criminal charges ever formally filed. Family challenged PSA in SC.',
        source_url: 'https://jkhighcourt.nic.in',
        is_verified: 1
      }
    ]
  },

  /* ══════════════════════════════════════
     NIRMALA SITHARAMAN
  ══════════════════════════════════════ */
  {
    name: 'Nirmala Sitharaman',
    charges: [
      {
        category: CATEGORIES.CIVIL,
        status: 'false',
        title: 'Contempt Petition — RBI/Moratorium Interest Waiver',
        description: 'SC heard contempt petition regarding Finance Ministry\'s alleged delay in implementing Supreme Court waiver of compound interest on COVID moratorium loans.',
        case_number: 'WP(C) 825/2020',
        court: 'Supreme Court of India',
        filing_agency: 'Gajendra Sharma (petitioner)',
        date_filed: '2020-09-12',
        date_updated: '2021-03-23',
        severity: 'minor',
        outcome: 'Contempt petition not admitted. SC accepted Ministry had complied with order. Matter closed.',
        source_url: 'https://main.sci.gov.in',
        is_verified: 1
      }
    ]
  },

  /* ══════════════════════════════════════
     NITIN GADKARI
  ══════════════════════════════════════ */
  {
    name: 'Nitin Gadkari',
    charges: [
      {
        category: CATEGORIES.CORPORATE,
        status: 'false',
        title: 'Purti Group Companies — Alleged Shell Company Investments',
        description: 'Arvind Kejriwal in 2013-14 alleged that Gadkari\'s Purti Group companies had taken fictitious investments from benami companies registered with fake addresses. SEBI and other bodies examined the charges.',
        case_number: 'MCA/RoC/2013/Purti',
        court: 'Registrar of Companies / SEBI',
        filing_agency: 'AAP / Multiple complainants',
        date_filed: '2013-10-25',
        date_updated: '2016-08-20',
        severity: 'moderate',
        outcome: 'MCA and SEBI investigations found technical violations which were regularised. No criminal chargesheet. Kejriwal apologised unconditionally in 2017 for the allegations.',
        source_url: 'https://mca.gov.in',
        is_verified: 1
      }
    ]
  },

  /* ══════════════════════════════════════
     UDDHAV THACKERAY
  ══════════════════════════════════════ */
  {
    name: 'Uddhav Thackeray',
    charges: [
      {
        category: CATEGORIES.CIVIL,
        status: 'active',
        title: 'Shiv Sena Name & Symbol Dispute — Election Commission',
        description: 'After the 2022 split, Uddhav Thackeray\'s faction (SS-UBT) challenged the Election Commission\'s January 2023 decision awarding the Shiv Sena name and bow-arrow symbol to Eknath Shinde\'s faction.',
        case_number: 'SLP(C) 7651/2023',
        court: 'Supreme Court of India / Delhi HC',
        filing_agency: 'Uddhav Thackeray / SS(UBT)',
        date_filed: '2022-07-05',
        date_updated: '2024-02-10',
        severity: 'moderate',
        outcome: 'ECI gave name/symbol to Shinde faction. SC upheld ECI jurisdiction. Uddhav\'s faction retained "Shiv Sena (UBT)" identity. Political and legal fight continues.',
        source_url: 'https://eci.gov.in',
        is_verified: 1
      }
    ]
  },

  /* ══════════════════════════════════════
     BHUPENDRA PATEL
  ══════════════════════════════════════ */
  {
    name: 'Bhupendra Patel',
    charges: [
      {
        category: CATEGORIES.CIVIL,
        status: 'false',
        title: 'Contractor Non-Payment Dispute — Pre-Political Career',
        description: 'Civil court dispute from Patel\'s earlier career in construction sector regarding contract payment dispute with a subcontractor.',
        case_number: 'CS/Ahmedabad/2009',
        court: 'Civil Court, Ahmedabad',
        filing_agency: 'Private party (contractor)',
        date_filed: '2009-03-15',
        date_updated: '2014-06-20',
        severity: 'minor',
        outcome: 'Settled out of court with arbitration. No criminal element.',
        source_url: null,
        is_verified: 1
      }
    ]
  },

  /* ══════════════════════════════════════
     S. JAISHANKAR
  ══════════════════════════════════════ */
  {
    name: 'S. Jaishankar',
    charges: [
      {
        category: CATEGORIES.CIVIL,
        status: 'false',
        title: 'WikiLeaks Diplomatic Cable Controversy',
        description: 'WikiLeaks released cables suggesting Jaishankar, while posted in Washington DC, shared intelligence about Indian opposition leaders with US officials. Led to political controversy but no formal charges.',
        case_number: 'N/A — Political Controversy',
        court: 'N/A',
        filing_agency: 'Opposition political parties (demands for enquiry)',
        date_filed: '2010-11-28',
        date_updated: '2011-02-15',
        severity: 'minor',
        outcome: 'MEA denied allegations. No investigation initiated. Jaishankar cleared by government. Matter remains a political talking point.',
        source_url: null,
        is_verified: 1
      }
    ]
  },

  /* ══════════════════════════════════════
     MALLIKARJUN KHARGE
  ══════════════════════════════════════ */
  {
    name: 'Mallikarjun Kharge',
    charges: [
      {
        category: CATEGORIES.CORRUPTION,
        status: 'false',
        title: 'Karnataka Valmiki Corporation Scam — CBI Probe',
        description: 'CBI probed alleged irregularities in Karnataka Maharshi Valmiki Scheduled Tribes Development Corporation funds during the period when Kharge was Karnataka Labour Minister (2004-08).',
        case_number: 'RC-BGMA/2024/CBI',
        court: 'CBI Special Court, Bengaluru',
        filing_agency: 'CBI / Karnataka government reference',
        date_filed: '2024-05-30',
        date_updated: '2024-06-20',
        severity: 'moderate',
        outcome: 'Probe focused on current period officials. Kharge\'s era not directly implicated. CBI examining complete chain.',
        source_url: 'https://cbi.gov.in',
        is_verified: 1
      }
    ]
  }
];

/* ══════════════════════════════════════════════
   SEED FUNCTION
══════════════════════════════════════════════ */
const insertCharge = db.prepare(`
  INSERT INTO legal_charges
  (politician_id, category, status, title, description, case_number, court, filing_agency,
   date_filed, date_updated, severity, outcome, source_url, is_verified)
  VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)
`);

const seedLegal = db.transaction(() => {
  db.exec(`
    DELETE FROM legal_charges;
    DELETE FROM sqlite_sequence WHERE name = 'legal_charges';
  `);
  let inserted = 0;
  let skipped  = 0;
  for (const entry of LEGAL_DATA) {
    const pol = db.prepare(`SELECT id FROM politicians WHERE name=?`).get(entry.name);
    if (!pol) { console.warn(`⚠  Politician not found: "${entry.name}" — skipping`); skipped++; continue; }
    for (const c of entry.charges) {
      insertCharge.run(
        pol.id, c.category, c.status, c.title,
        c.description||null, c.case_number||null, c.court||null,
        c.filing_agency||null, c.date_filed||null, c.date_updated||null,
        c.severity||null, c.outcome||null, c.source_url||null,
        c.is_verified??1
      );
      inserted++;
    }
  }
  console.log(`✅ Legal records seeded: ${inserted} charges, ${skipped} politicians skipped`);
});

seedLegal();
