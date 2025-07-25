/**
 * Job Title Categorization Mapping for Pipedrive Visualizations
 * Based on analysis of actual job titles from Land iQ - Project Management users
 */

export interface JobTitleCategory {
  name: string;
  description: string;
  color: string;
  keywords: string[];
}

export const JOB_TITLE_CATEGORIES: Record<string, JobTitleCategory> = {
  'Executive Leadership': {
    name: 'Executive Leadership',
    description: 'C-Suite, Directors, General Managers, and Senior Leadership',
    color: '#8B5CF6', // Purple
    keywords: [
      'CEO', 'Chief Executive', 'Managing Director', 'General Manager', 'Director',
      'Executive Director', 'Associate Director', 'Secretary', 'Deputy Secretary',
      'Minister', 'President', 'Vice President', 'Chief', 'Head of', 'GM',
      'CCO', 'CTO', 'Principal', 'Commissioner', 'Board Member', 'Executive',
      'Chair', 'Future Cities Leader', 'National Executive', 'Regional Executive',
      'Section Executive'
    ]
  },
  'Planning': {
    name: 'Planning',
    description: 'Strategic planners, traditional planning roles, urban planning, and assessment',
    color: '#3B82F6', // Blue
    keywords: [
      'Strategic Planner', 'Strategy', 'Strategic Planning', 'Strategy Advisor', 'Strategic',
      'Planning Officer', 'Town Planner', 'Urban Planner', 'Planner',
      'Planning Manager', 'Principal Planner', 'Senior Planner',
      'Environmental Planner', 'Transport Planner', 'Planning'
    ]
  },
  'Policy': {
    name: 'Policy',
    description: 'Policy officers, policy analysts, and policy development roles',
    color: '#F59E0B', // Yellow/Orange
    keywords: [
      'Policy Officer', 'Policy Analyst', 'Policy'
    ]
  },
  'Development & Project Management': {
    name: 'Development & Project Management',
    description: 'Development managers, project officers, and project management',
    color: '#10B981', // Green
    keywords: [
      'Development Manager', 'Project Manager', 'Project Officer', 'Program Manager',
      'Project Coordinator', 'Development Director', 'Project Director',
      'Development', 'Project', 'Program', 'Developer', 'Implementation Officer',
      'Service Need Analysis'
    ]
  },
  'Financial': {
    name: 'Financial',
    description: 'Investment management and financial roles',
    color: '#8B5CF6', // Deep Purple
    keywords: [
      'Investment Management'
    ]
  },
  'Data & Analytics': {
    name: 'Data & Analytics',
    description: 'GIS, data analysis, technical, and analytics roles',
    color: '#EF4444', // Red
    keywords: [
      'GIS', 'Spatial', 'Data Scientist', 'Analyst', 'Technical',
      'Geospatial', 'Business Analyst', 'Research',
      'Analytics', 'Data', 'Technical Officer', 'Technology Solutions',
      'Online Processing'
    ]
  },
  'Architecture & Engineering': {
    name: 'Architecture & Engineering',
    description: 'Architects, engineers, surveyors, and design professionals',
    color: '#EC4899', // Pink
    keywords: [
      'Engineer', 'Architect', 'Surveyor', 'Building Designer', 'Designer',
      'Architectural Designer', 'Concept Designer'
    ]
  },
  'Property & Asset Management': {
    name: 'Property & Asset Management',
    description: 'Property management, asset management, and valuation roles',
    color: '#06B6D4', // Cyan
    keywords: [
      'Property Officer', 'Property Manager', 'Asset Manager', 'Valuer',
      'Property', 'Asset', 'Acquisition', 'Valuation', 'Land Services',
      'Graduate Valuer'
    ]
  },
  'Operations & Administration': {
    name: 'Operations & Administration',
    description: 'Operational management, administration, and support roles',
    color: '#84CC16', // Lime
    keywords: [
      'Manager', 'Team Leader', 'Coordinator', 'Administration',
      'Executive Assistant', 'Support', 'Operations', 'Customer Service',
      'Office Manager', 'Administrative', 'Customer Success', 'Staff Officer',
      'Business Improvement', 'Team Co-ordinator', 'Contributions Officer'
    ]
  },
  'Consulting & Advisory': {
    name: 'Consulting & Advisory',
    description: 'External consultants, advisors, and advisory roles',
    color: '#8B5A2B', // Brown
    keywords: [
      'Consultant', 'Advisory', 'Associate', 'Partner', 'Freelance',
      'Principal Consultant', 'Senior Consultant', 'Advisor'
    ]
  },
  'Academic & Education': {
    name: 'Academic & Education',
    description: 'Academic, education, research, and student roles',
    color: '#F97316', // Orange
    keywords: [
      'Professor', 'Associate Professor', 'Senior Lecturer', 'Lecturer',
      'Student', 'Graduate', 'Research', 'Researcher', 'Academic',
      'University', 'Education', 'Teaching', 'Student Landscape',
      'Graduate Strategic'
    ]
  },
  'Other Specialised Technical': {
    name: 'Other Specialised Technical',
    description: 'Other specialized technical and professional services',
    color: '#9333EA', // Violet
    keywords: [
      'Energy Rater', 'Economist', 'Legal', 'Software Engineer',
      'Environmental Assistant', 'Building Surveyor', 'Urban Designer',
      'Public Domain Designer', 'Urbanist', 'Water Resource Officer', 'Safety Officer',
      'Conveyancing Officer', 'Commercial Specialist', 'Transport NBC',
      'Climate Change Specialist', 'Land Rights Officer'
    ]
  }
};

/**
 * Categorizes a job title into one of the predefined categories
 * @param jobTitle - The job title to categorize
 * @returns The category key or 'Other' if no match found
 */
export function categorizeJobTitle(jobTitle: string): string {
  if (!jobTitle || jobTitle.trim() === '') {
    return 'Other';
  }

  const title = jobTitle.toLowerCase().trim();

  // Check each category's keywords
  for (const [categoryKey, category] of Object.entries(JOB_TITLE_CATEGORIES)) {
    for (const keyword of category.keywords) {
      if (title.includes(keyword.toLowerCase())) {
        return categoryKey;
      }
    }
  }

  return 'Other';
}

/**
 * Get category information for a given category key
 * @param categoryKey - The category key
 * @returns Category information or null if not found
 */
export function getCategoryInfo(categoryKey: string): JobTitleCategory | null {
  return JOB_TITLE_CATEGORIES[categoryKey] || null;
}

/**
 * Get all available categories
 * @returns Array of all category keys
 */
export function getAllCategories(): string[] {
  return Object.keys(JOB_TITLE_CATEGORIES);
}

/**
 * Get category color for visualization
 * @param categoryKey - The category key
 * @returns Hex color code
 */
export function getCategoryColor(categoryKey: string): string {
  const category = JOB_TITLE_CATEGORIES[categoryKey];
  return category ? category.color : '#6B7280'; // Default gray for 'Other'
}

/**
 * Analyze job titles and return categorized distribution
 * @param jobTitles - Array of job title strings
 * @returns Object with category distribution
 */
export function analyzeJobTitleDistribution(jobTitles: string[]): Record<string, number> {
  const distribution: Record<string, number> = {};
  
  // Initialize all categories with 0
  Object.keys(JOB_TITLE_CATEGORIES).forEach(category => {
    distribution[category] = 0;
  });
  distribution['Other'] = 0;

  // Categorize each job title
  jobTitles.forEach(title => {
    const category = categorizeJobTitle(title);
    distribution[category] = (distribution[category] || 0) + 1;
  });

  return distribution;
}

/**
 * Manual mapping for specific titles that might need special handling
 * This overrides the keyword-based categorization for edge cases
 */
export const MANUAL_TITLE_MAPPINGS: Record<string, string> = {
  // Executive Leadership
  'CEO': 'Executive Leadership',
  'Managing Director': 'Executive Leadership',
  'Chief Executive Officer': 'Executive Leadership',
  'Executive Director': 'Executive Leadership',
  'Minister for Lands and Property': 'Executive Leadership',
  'Government Architect': 'Executive Leadership',
  'Principal': 'Executive Leadership',
  'CCO': 'Executive Leadership',
  'CTO': 'Executive Leadership',
  'Non Executive Board Member': 'Executive Leadership',
  'Infrastructre Commissioner': 'Executive Leadership',
  '24 Hour Economy Commissioner (NSW)': 'Executive Leadership',
  'Chair - Hunter Chapter Committee': 'Executive Leadership',
  'National Executive Mine Closure': 'Executive Leadership',
  'Regional Executive': 'Executive Leadership',
  'Section Executive, Water': 'Executive Leadership',
  'National Executive - Ecology': 'Executive Leadership',
  'ED, Adaptation & Mitigation': 'Executive Leadership',
  'Masterplanned Communities NSW & ACT (UDIA Board Member)': 'Executive Leadership',
  'Deputy General Manger of Infrastructure': 'Executive Leadership',
  'Future Cities Leader': 'Executive Leadership',
  'National Industrial Lead': 'Executive Leadership',
  'Group Leader - Design ACT': 'Executive Leadership',
  'Lead Organiser': 'Executive Leadership',
  
  // Planning
  'Strategic Planner': 'Planning',
  'Senior Strategic Planner': 'Planning',
  'Principal Strategic Planner': 'Planning',
  'Planning Officer': 'Planning',
  'Senior Planning Officer': 'Planning',
  'Town Planner': 'Planning',
  'Urban Planner': 'Planning',
  
  // Policy
  'Policy Officer': 'Policy',
  'Policy Analyst': 'Policy',
  'Senior Policy Officer': 'Policy',
  'Senior Planning Policy Officer': 'Policy',
  'Principal Policy Officer': 'Policy',
  
  // Development & Project Management
  'Development Manager': 'Development & Project Management',
  'Senior Development Manager': 'Development & Project Management',
  'Project Manager': 'Development & Project Management',
  'Project Officer': 'Development & Project Management',
  'Developer': 'Development & Project Management',
  'Principal Implementation Officer': 'Development & Project Management',
  'Service Need Analysis': 'Development & Project Management',
  
  // Financial
  'Investment Management': 'Financial',
  
  // Data & Analytics
  'GIS Manager': 'Data & Analytics',
  'GIS Specialist': 'Data & Analytics',
  'Data Scientist': 'Data & Analytics',
  'Senior Data Scientist': 'Data & Analytics',
  'Technology Solutions Lead': 'Data & Analytics',
  'DPHI Account Ececutive': 'Data & Analytics',
  'Environmental Assistant': 'Data & Analytics',
  'Senior Communications and Engagement Officer': 'Data & Analytics',
  
  // Architecture & Engineering
  'Architect': 'Architecture & Engineering',
  'Architectural Designer': 'Architecture & Engineering',
  'Building Designer': 'Architecture & Engineering',
  'Senior Concept Designer': 'Architecture & Engineering',
  'Architectural Graduate': 'Architecture & Engineering',
  
  // Property & Asset Management
  'Property Officer': 'Property & Asset Management',
  'Senior Property Officer': 'Property & Asset Management',
  'Asset Manager': 'Property & Asset Management',
  'Valuer': 'Property & Asset Management',
  'Graduate Valuer': 'Property & Asset Management',
  
  // Operations & Administration
  'Manager': 'Operations & Administration',
  'Team Leader': 'Operations & Administration',
  'Coordinator': 'Operations & Administration',
  'Customer Success': 'Operations & Administration',
  'Staff Officer': 'Operations & Administration',
  'Business Improvement Officer': 'Operations & Administration',
  'Acting Business Improvement Specialist': 'Operations & Administration',
  'Team Co-ordinator': 'Operations & Administration',
  'Senior Contributions Officer': 'Operations & Administration',
  'Assistant Contributions Officer': 'Operations & Administration',
  'Senior Contracts Officer': 'Operations & Administration',
  'Online Processing': 'Operations & Administration',
  'BD': 'Operations & Administration',
  
  // Consulting & Advisory
  'Consultant': 'Consulting & Advisory',
  'Senior Consultant': 'Consulting & Advisory',
  'Associate': 'Consulting & Advisory',
  'Partner': 'Consulting & Advisory',
  'Principal, Government': 'Consulting & Advisory',
  'Principal, Communities and Social Performance': 'Consulting & Advisory',
  
  // Academic & Education
  'Graduate': 'Academic & Education',
  'Student': 'Academic & Education',
  'Senior Lecturer': 'Academic & Education',
  'Student Landscape Architect': 'Academic & Education',
  
  // Other Specialised Technical
  'Urban Designer': 'Other Specialised Technical',
  'Senior Urban Designer': 'Other Specialised Technical',
  'Public Domain Designer': 'Other Specialised Technical',
  'Senior Urbanist': 'Other Specialised Technical',
  'Building Surveyor': 'Other Specialised Technical',
  'Senior Building Surveyor': 'Other Specialised Technical',
  'Water Resource Officer': 'Other Specialised Technical',
  'Energy Rater': 'Other Specialised Technical',
  'Economist': 'Other Specialised Technical',
  'Principal Economist': 'Other Specialised Technical',
  'Water Regulation Officer': 'Other Specialised Technical',
  'Climate Change Specialist': 'Other Specialised Technical',
  'Senior Land Rights Officer': 'Other Specialised Technical',
  'Network & Safety Officer (Roads)': 'Other Specialised Technical',
  'Senior Commercial Specialist - Storage': 'Other Specialised Technical',
  'Snr Conveyancing Officer': 'Other Specialised Technical',
  'Transport NBC': 'Other Specialised Technical'
};

/**
 * Enhanced categorization that checks manual mappings first, then falls back to keyword matching
 * @param jobTitle - The job title to categorize
 * @returns The category key or 'Other' if no match found
 */
export function categorizeJobTitleEnhanced(jobTitle: string): string {
  if (!jobTitle || jobTitle.trim() === '') {
    return 'Other';
  }

  const title = jobTitle.trim();

  // Check manual mappings first (exact match)
  if (MANUAL_TITLE_MAPPINGS[title]) {
    return MANUAL_TITLE_MAPPINGS[title];
  }

  // Fall back to keyword-based categorization
  return categorizeJobTitle(title);
} 

/**
 * Debug function to log uncategorized job titles from actual data
 * This helps identify why certain titles end up in the "Other" category
 */
export function logUncategorizedJobTitles(jobTitles: string[]): {
  uncategorized: [string, number][];
  categorizedCount: number;
  uncategorizedCount: number;
} {
  console.log('🔍 Analyzing uncategorized job titles...');
  
  const uncategorized = new Map<string, number>();
  const categorized = new Map<string, number>();
  
  jobTitles.forEach(title => {
    if (!title || title.trim() === '') {
      uncategorized.set('(empty/null)', (uncategorized.get('(empty/null)') || 0) + 1);
      return;
    }
    
    const category = categorizeJobTitleEnhanced(title);
    if (category === 'Other') {
      uncategorized.set(title, (uncategorized.get(title) || 0) + 1);
    } else {
      categorized.set(`${title} -> ${category}`, (categorized.get(`${title} -> ${category}`) || 0) + 1);
    }
  });
  
  // Sort uncategorized by frequency
  const sortedUncategorized = Array.from(uncategorized.entries()).sort((a, b) => b[1] - a[1]);
  
  console.log(`\n⚠️ Uncategorized job titles (${uncategorized.size} unique, ${Array.from(uncategorized.values()).reduce((a, b) => a + b, 0)} total):`);
  sortedUncategorized.forEach(([title, count]) => {
    console.log(`  "${title}" (${count}x)`);
  });
  
  console.log(`\n✅ Successfully categorized: ${categorized.size} unique titles`);
  
  return {
    uncategorized: sortedUncategorized,
    categorizedCount: categorized.size,
    uncategorizedCount: uncategorized.size
  };
}

/**
 * Test function to check coverage of all job titles from jobtitles.md
 * This function will categorize all titles and show which ones fall into 'Other'
 */
export function testJobTitleCoverage(): void {
  // All job titles from jobtitles.md (extracted from the data)
  const allJobTitles = [
    'Director', 'Strategic Planner', 'CEO', 'Planning Officer', 'Senior Development Manager',
    'Development Manager', 'Senior Policy Officer', 'Senior Strategic Planner', 'Project Officer',
    'Managing Director', 'Associate Director', 'Senior Project Officer', 'Senior Manager',
    'Senior Planner', 'Principal Strategic Planner', 'Team Leader', 'Senior Planning Officer',
    'Project Manager', 'Town Planner', 'Executive Director', 'Assistant Development Manager',
    'Senior Project Manager', 'Manager', 'Senior Urban Designer', 'Senior Consultant',
    'Development Director', 'Senior Open Space Planner', 'Manager Planning and Development',
    'Associate', 'Analyst', 'Senior Property Officer', 'Graduate', 'Coordinator Strategic Planning',
    'Senior Property Development Manager', 'Urban Designer', 'Strategic Land Use Planner',
    'Project Coordinator', 'Senior Associate', 'Project Director', 'Principal',
    'Associate Professor', 'Water Regulation Officer', 'Senior Transport Planner',
    'Investment Attraction Researcher & Project Manager', 'Planning Director', 'Principal Project Officer',
    'Senior Development Director', 'Senior Planning Policy Officer', 'Policy Analyst',
    'Team Leader Strategic Planning', 'Transport Planning Manager', 'GIS Specialist',
    'Group Manager', 'Assistant Property Officer', 'Property Officer', 'GIS Manager',
    'Senior Town Planner', 'Manager Planning & Development', 'Land Use Planning Manager',
    'GIS Administrator', 'Strategic Planning Coordinator', 'Senior Urban Planner',
    'Executive Manager', 'Spatial Analyst', 'Project Coord Advisory & Transactions',
    'Senior Policy Advisor', 'Planner', 'Deputy Secretary', 'Manager Strategic Planning',
    'Director Planning', 'Partner', 'Urban Planner', 'Manager Land Use Planning',
    'Secretary', 'Principal Planner', 'National Executive, Infrastructure Advisory',
    'Technical Executive - Strategic Asset Management', 'Technical Director, Planning and Mobility',
    'Chief Executive', 'Commercial Manager', 'Senior Manager Business Case Centre of Excellence,',
    'General Manager', 'Manager of Strategic Planning', 'Strategy Advisor – Social',
    'Design Director', 'Head of Development', 'Chief Executive Officer', 'Architectural Designer',
    'Developer', 'Architect', 'Environmental Planner', 'Manager State Rezoning',
    'Senior Valuer', 'Spatial Team Lead', 'Design Assurance Engineer', 'Principal Implementation Officer',
    'Director - Integrated Planning and Programs', 'Executive Director - Property Group Commercial, Performance & Strategy',
    'Manager – Asset Management', 'Director Planning Partnership Office', 'Project Manager for Large Precinct Plans',
    'Senior Manager - Data Reform', 'Executive Officer - Infrastructure and Assets',
    'Senior Regional Planning Officer', 'Manager – CtG Coordination and Delivery',
    'Principal Technical Services Officer', 'Manager Built Assets', 'Senior Analyst - Strategic Intelligence',
    'Principal Planning Officer - Strategic Capability Directorate', 'Senior Concept Designer',
    'Geographic Information Systems Manager', 'Manager Clients and Marketing, Riverina Western Region',
    'Manager Infrastructure & Planning', 'Principal Advisor', 'Program Manager',
    'Director, Planning, Housing & Infrastructure', 'Manager, Acquisitions and Divestments',
    'Senior Economic Analyst', 'Director Regional Strategic Planning', 'Senior Manager Placemaking',
    'Climate Risk Manager', 'Acting Executive Director, Infrastructure Planning',
    'Service Need Analysis', 'Manager – Major Projects', 'Senior City Planner',
    'Executive Director, Strategic Advisory Services', 'Senior Property Analyst',
    'Senior GIS Lead', 'Manager Spatial Sciences and Design', 'Director, Property',
    'Senior Planning Policy Officer, Senior Planning Policy Officer',
    'Portfolio AssManager, Leasing and Place Management', 'Program Delivery Manager',
    'Aciting Executive Director, Strategic Advisory Services', 'Team Lead Property & Development App',
    'Project Manager Advisory & Transactions', 'Manager Urban Design',
    'Manager, Local Planning (Central, West and South)', 'Director, Property Operations',
    'Senior Manager Land Use Planning (working with HSRA)', 'Program Manager – Property Transactions',
    'Data and Visualisation Manager', 'Strategic Urban Designer', 'Assistant GIS Office',
    'Administration Officer, Strategy, Innovation and Sustainability',
    'Senior Manager, Evaluation and Partnerships', 'Manager, Strategy, Innovation and Sustainability',
    'Strategy, Innovation and Sustainability', 'Corridor Director', 'Project Officer Land Information',
    'Environmental Assistant', 'Principal Surveyor and Group Manager, Survey, Spatial & Property',
    'Corridor Coordinator', 'Manager Transport Services and Infrastructure Planning',
    'Director Land Information Group', 'Senior Manager Planning', 'A/Director Disaster Risk Mitigation',
    'Property Officer Planning', 'Director Strategic Project Development',
    'Director Corridor Identification and Protection', 'Manager Land Use and Transport Planning',
    'Planning Lead & Principal Planning Officer, Strategic Advisory Services',
    'A/Director Property', 'Director, Strategy, Strategic Advisory Services',
    'Senior Manager, Strategic Advisory Services', 'Property Analyst, Policy & Strategy',
    'CCO', 'Team Leader, Alpine Resorts Team', 'Project Coordinator, Strategic Advisory Services',
    'CTO', 'Technical Executive, Digital', 'Property Planner', 'Senior Analyst, Property Strategy',
    'Principal Data Scientist', 'Manager, Urban Development Program (Western Sydney)',
    'Manager Property Co-ordination', 'Support Manager', 'Manager - Land iQ Data and Analytics',
    'Associate Director, Spatial Analytics and Insights', 'Property Co-ordinator North Region',
    'Customer Success Manager', 'Project Delivery Operations Lead, Digital',
    'Property Co-ordinator South & West Regions', 'Director - Central City',
    'Property Co-ordinator Sydney', 'Planning & Property Co-ordination',
    'Manager Movement and Place', 'Land Acquisition Officer', 'Senior Place Planner',
    'Manager Strategy & Performance', 'Property Optimisation Manager', 'Customer Success',
    'Associate Principal Consultant, Net Zero', 'Senior Commercial Specialist - Storage',
    'Senior Economics Manager', 'Senior Officer Asset Data and Systems',
    'Senior Policy and Program Officer', 'Manager Operations', 'HAFF - Project Lead',
    'Manager - Strategic Priorities', 'Principal Valuer Rating & Taxing',
    'Coordinator Strategic Land Use Planning', 'Spatial Planning Officer',
    'Senior Contributions Officer', 'Specialist Planning Officer',
    'Director Wagga and Snowy Special Activation Precincts',
    'Local Planning and Council Support Hunter and Northern Region',
    'Manager Policy & Governance (Land Use), Regional and Outer Metropolitan',
    'Partnership Manager - Special Projects', 'Associate Director, Data Evaluation & Reporting',
    'Director of Digital Services', 'Junior Project Manager', 'Project Manager - Disposal',
    'Development and Divestment Manager', 'Administration Coordinator', 'Team Leader, Strategic Planner',
    'Planning & Compliance Officer', 'Asset/Property Manager', 'Business Improvement Officer',
    'Statutory Town Planner', 'Senior Coordinator Urban Design', 'Manager of Growth and Development',
    'Manager Regional Resilience Programs', 'Business Manager Strategic Planning',
    'Land Development Officer', 'Planning Service Coordinator', 'Strategic & Environmental Planning Manager',
    'Team Leader Spatial Technology', 'Property & Roads Partner', 'Team Co-ordinator',
    'Manager Property & Recreation', 'Manager Planning and Regulation', 'Engineer',
    'Asset Engineer', 'Manager Development Assessment', 'Director Planning and Environmental Services',
    'Geospatial Information Lead', 'Asset Officer', 'Acting Business Improvement Specialist',
    'Senior Coordinator City Property', 'Urban Design Coordinator', 'Manager Planning, Regulatory & Compliance',
    'Coordinator GIS and Corporate Data', 'Manager Building & Development Services',
    'Divisional Manager Development and Compliance', 'Manager Building and Strategic Projects',
    'Executive Assistant - Planning & Compliance', 'Business Improvement & IT Manager',
    'Public Domain Designer', 'GIS Analyst', 'Strategic Planning Officer',
    'Manager Planning Building and Health', 'Coordinator - Asset Management',
    'Team Coordinator Urban Planning', 'GIS Officer', 'EA Planning',
    'Strategic Property Investment Coordinator', 'Planning & Infrastructure Analyst',
    'Planning Technical Officer', 'Principal Coordinator Forward Planning',
    'Senior Manager Property and Commercial', 'Director - Environmental Services & Planning',
    'Executive Manager Planning & Regulation', 'GIS Analyst - Strategic Planning',
    'Manager Strategic Planning & Environment', 'Project Manager-Water & Sewerage',
    'Coordinator City Planning', 'GIS Lead', 'Building Surveyor', 'Coordinator City Property',
    'Team Leader Spatial Information', 'Coordinator Land Information Corporate',
    'Health & Development Coordinator', 'Development Planner', 'Coordinator Building & Landscape Design',
    'Team Leader Graphics / Strategic Planner', 'GIS', 'Coordinator Land Use Planning and Spatial Services',
    'Legal Director', 'Chief Property Officer', 'Team Leader Urban Design',
    'Climate Change Risk Manager', 'Staff Officer', 'Snr Conveyancing Officer',
    'Assistant Strategic Planner', 'Senior Consultant - Development, Planning & Urban Design',
    'Advisory Director - Planning', 'Advisory Director - Real Estate', 'Advisory Director – Digital',
    'Manager, State Rezoning', 'Technical Manager', 'Property & Land Manager',
    'Director Closing the Gap', 'A/Senior Team Leader', 'Senior Land & Property Manager, New England REZ',
    'Senior Transport Engineer', 'Senior Transport Planner Customer',
    'Senior Transport Planner – Western Parkland City', 'Team Leader Design',
    'Contractor Senior Project Officer', 'Director Hazard, Risk and Data Assurance',
    'Manager – Geospatial Analytics', 'Geospatial Analyst', 'Senior Planner for Culture',
    'Transport NBC', 'Place Planning Coordinator', 'Senior Manager Strategy & Major Programs',
    'Executive Assistant', 'Manager Model Planning', 'Office Manager',
    'Senior Solutions Consultant, Digital', 'Network & Safety Officer (Roads)',
    'Assistant Contributions Officer', 'Manager Sustainable Development',
    'Spatial Systems Administrator', 'Acting Property Officer', 'Principal Policy Officer',
    'Senior Manager Transport Planning \\nStrategic Project Development',
    'Development Advisory Services Coordinator', 'Team Leader LIS and GIS',
    'Senior Environmental Planner', 'Open Space Project Officer, Land Management',
    'Project Manager Open Spaces', 'Internal Communications Manager',
    'Director of Software Delivery, Digital', 'Planner and Environmental',
    'Manager Development and Land Use Planning', 'Executive Director Planning and Environment',
    'Senior Data Scientist', 'Director Environmental Services', 'Section Manager Development Services',
    'Land Services Officer', 'Property Development Manager', 'Manager, Divestments & Acquisitions, Property Officer',
    'Associate Transport Planner', 'Development Officer', 'Urban and Regional Planner',
    'GIS Manager - Technical Design & Engineering', 'Senior Specialist Planner',
    'Snr Planning Officer Urban Dev Program', 'Senior Consultant, Communications & Engagement',
    'Strategic planning Executive Manager', 'Planner/Urban Designer (E-Planning)',
    'A/Director Pipeline Strategy', 'Senior Open Space Planner, Open Space Strategy & Policy',
    'Manager Strategic Planning and Economic Development', 'Associate Urban Designer',
    'Director PlanTech', 'Associate Director - Strategic Planning', 'Associate - urban designer',
    'Associate Director (Urban Design)', 'Consultant', 'Senior Urbanist', 'Senior Lecturer',
    'Duty Planner', 'Manager Planning & Develpoment', 'Director Planning & Environment',
    'Deputy General Manger of Infrastructure', 'Director Environmental & Community Services',
    'Director Environment & Planning', 'Manager of Heath and Development',
    'Manager Planning & Compliance', 'Director Planning and Infrastructure',
    'Manager Development and Planning', 'GM APAC', 'Property Portfolio Development Manager',
    'Leasing Portfolio Manager', 'Principal, Government', 'Program Manager, Strategic Project Planning',
    'Senior Strategic Planner Economic Development', 'Senior Business Analyst',
    'Senior Manager, Design and Space Strategy', 'Development Manager, Redfern North Eveleigh',
    'Senior Manager Partnerships and Research', 'In-ground Services Coordinator',
    'Property Support Officer', 'Project Coordinator, Advisory & Transactions',
    'Portfolio Manager Portfolio Management', 'Senior Contracts Officer',
    'Senior Manager Property & Asset Mgmt', 'Director Operations OSL',
    'Senior Urban Design Planner', 'Strategic Planning Specialist', 'Non Executive Board Member',
    'Head of Planning', 'Operational Services Director', 'General Manager Development NSW',
    'Pre Contracts Manager', 'Vice President, ESG & Innovation', 'Director of Planning and Development',
    'National Design Director', 'National Planning Manager (Exec Committee Urban Taskforce)',
    'Project Design Management Director', 'Executive General Manager Development',
    'General Manager Government Relations', 'Head of Design & Project Management',
    'General Manager, Environment Sustainability and Safety', 'Chief of Policy and Research',
    'President and MD Australia', 'Senior Policy Adviser', 'Regional Manager Government Relations',
    'Infrastructre Commissioner', 'GM Technical and Design', 'Acquisitions Lead',
    'Executive General Manager - Projects and Commercial',
    'Masterplanned Communities NSW & ACT (UDIA Board Member)', 'Managing Director of Advisory',
    'Managing Director of Transport', 'Managing Director of Earth & Environment',
    'General Manager Customer, Place & Operations', 'Director of Marketing and Communications',
    'General Manager Stakeholder & Communications', 'Head of Brand and Marketing',
    'Campaigns Manager - Events', 'Global Director, Digital', 'Technical Director',
    'Technical Executive', 'Director, Bridges, Aviation and Roads',
    'Director, Rail, Maritime and Freight', 'Principal Rail Engineer', 'Associate Rail Engineer',
    'Social Strategy, Infrastructure Advisory', 'Director, Client & Growth',
    'National Executive Mine Closure', 'Principal, Communities and Social Performance',
    'Mining Project Delivery Executive', 'Regional Executive', 'Engagement Team Leader, NSW',
    'Director of Ecology and Environmental Approvals',
    'Director of Contaminated Land Management and Water',
    'Technical Director of Planning and Approvals',
    'Principal Consultant - Strategic Asset Management', 'Principal Economist',
    'Regional Executive, Planning and Mobility', 'Principal Transport Engineer',
    'Director of Clients and Growth, Advisory', 'Design Engineer and EPN Chair',
    'Director of Building Services', 'Principal Director, Structures & Civil NSW and Regional Director',
    'Principal Director, Building Services Manager NSW', 'Director Structures',
    'Director Building Services', 'Client Director, NSW/ACT', 'Director, Technical Excellence & Innovation',
    'CEO, BDA', 'Strategic Partnerships Manager', 'Deputy Secretary, Crown Lands',
    'Future Ready & Net Zero Program Manager', 'Executive Director Spatial Services',
    'General Manager Sales & Marketing', 'Chief Operating Officer',
    '24 Hour Economy Commissioner (NSW)', 'Director Asset Strategy, Programs & Compliance',
    'Director Spatial Operations', 'Major Projects Executive', 'Government Architect',
    'Executive Director Planning and Communities', 'Associate Director, Policy and Evaluation',
    'Executive Director, Strategy, Policy & Finance', 'Principal Transport Planner',
    'Senior Manager Stakeholders & Engagement', 'A/CEO, Health Infrastructure',
    'Director, Regional Coordination', 'Associate Director, External Engagement & Strategy',
    'Executive Director, Portfolio Strategy and Origination', 'Principal, Infrastructure Advisory',
    'Director - Strategy, Planning and Innovation', 'Executive Director, Technical Advisory Services',
    'CEO, Landcom', 'Section Executive, Water', 'Director Planning & Policy',
    'Executive Director, Strategy, Policy and Regulation', 'Executive Director of Operations',
    'Head of Strategy, Planning and Innovation', 'Principal Director, P&B Transport Sector Lead',
    'Head of Infrastructure Assurance at Infrastructure NSW.',
    'Director for Landowner/Property Acquisition', 'Planning Policy Manager',
    'Executive Director Strategy & Policy', 'A/Executive Director Corporate Services',
    'Executive Director - State Rezoning', 'Executive Director, Strategy and Policy',
    'Executive Director - Strategy, Planning and Innovation',
    'Executive Director, Infrastructure Policy', 'Executive Director, Governance and Insights',
    'Deputy Secretary Development Assessment and Infrastructure', 'Principal Consultant',
    'Deputy Secretary Local Government',
    'Acting Executive Director, Planning Delivery and Integration', 'Associate Transport Engineer',
    'Acting Executive Director, Metro Central and North, Planning and Land Use Strategy',
    'National Executive - Ecology', 'Executive Director, Local Government',
    'Executive Director, Housing and Key Sites Assessment',
    'Executive Director, Operations and Planning Delivery',
    'Executive Director Resilience and Sustainability',
    'Executive Director, Aboriginal Strategy, Policy & Engagement', 'Director Urban Design',
    'Executive Director Digital, Analytics and Insights',
    'Director of Digital Services - Planning Portal', 'Director Southern Region',
    'Director - Transport Advisory', 'Director, Transport Planning, Central City',
    'Director,Hazard, Risk and Data Assurance', 'Senior Communications Advisor',
    'A/Deputy Secretary, School Infrastructure', 'Minister for Lands and Property',
    'Executive Director, Engineering Design Assurance', 'Executive GM Infrastructure Delivery',
    'Principal Project Manager, Critical Infrastructure Program', 'ED, Adaptation & Mitigation',
    'Executive Director Planning and Assessments', 'Head of Customer Operations and Outcomes',
    'Executive Director Housing and Planning', 'Director, Property, Facilities and Asset Sustainability',
    'Executive GM Water and Environmental Services', 'Deputy Secretary, Infrastructure and Place',
    'Acting CEO', 'Director Disaster Risk Management', 'Director, Customer & Product',
    'Director Infrastructure Planning', 'Deputy Secretary, Economic and Environment Policy Group',
    'Head of Engineering and Technical Support', 'Deputy Secretary, Planning, Integration and Passenger',
    'ED, Hazard, Risk and Data Management', 'Executive General Manager, Strategy & Innovation',
    'Executive Director Customer & Service Planning', 'Executive Director Active Transport',
    'Head of Growth and Development', 'Director Val iQ', 'GM Asset Planning and Delivery',
    'Executive Director, Property Development and Land Access', 'Head of Technical Services',
    'Head of Systems Planning and Land Acquisition', 'Manager Hazard and Climate Analysis',
    'Director - Business Case', 'Investment Management', 'Lead Transport Analyst',
    'Executive Director Planning for Places, Transport Planning', 'Director Strategy - Freight',
    'Project Director - Western Sydney Freight Line', 'Director Regional Networks',
    'Planning Manager', 'Executive Director, Smart Places', 'Director - Data Engineering',
    'Chief Transport Planner', 'Director, Strategic Land Use',
    'Director Transport Modelling, Advanced Analytics and Insights', 'ED TfNSW Project Development',
    'Director Freight Data', 'Director Smart Places Program',
    'Director, Project Development - Public Transport Projects', 'Manager Business Case Development',
    'A/Executive Director Freight', 'Director, Business Case Centre of Excellence',
    'Head of Technical Services (acting)', 'Executive Director, Digital Engineering',
    'Director Land Use', 'Executive Director Transport Strategy',
    'Manager, Place and Public Life, Active Transport and Vibrancy',
    'Senior Communications and Engagement Officer',
    'A/Senior Manager Place Programs, Active Transport and Vibrancy',
    'Director Engineering Sustainable Infrastructure', 'Executive Strategic Planner',
    'Manager City Strategy and Design', 'Infrastructure Strategy and Planning Coordinator',
    'Manager Corporate Strategy & Economic Development', 'Executive Director City Infrastructure',
    'Manager Social Strategy', 'City Strategy Manager, City Strategy Unit',
    'Coordinator Strategic Assessment', 'Executive Manager, Strategic and Place Planning',
    'Director City Futures', 'Associate Director – Delivery',
    'Executive Director Corporate Services and Chief Financial Officer',
    'Founder and Managing Director', 'Planning, Transaction & Development Manager',
    'Chief Development Officer', 'Director, Infrastructure Policy Advancement',
    'Head of Property Development and Community Engagement', 'Executive Development Director',
    'Data Product Manager', 'Director/Owner', 'Group Executive & Head of Development',
    'DPHI Account Ececutive', 'Technical Director, Built Environment',
    'Manager Continued Operations', 'General Manager Hydrogen', 'Lead Data Engineer and Partner Lead',
    'Vice President, Head of Development - Asia Pacific', 'Chair - Hunter Chapter Committee',
    'CEO and Founder', 'GM Capital and Advisory', 'Group Manager, NSW Government',
    'NSW/ACT Policy and Media Manager', 'GM, ANZ Public Sector', 'Head of Public Sector',
    'General Manager, Land, Property and Approvals', 'Head of Government Relations & Industry Affairs',
    'Account Technology Strategist', 'NSW Government Industry Business Development Manager',
    'Executive General Manager, Stakeholder Engagement and Public Relations',
    'Director/Co Founder', 'Director of Digital', 'Infrastructure Consultant',
    'Engagement Lead - Major Projects', 'Associate (Urban Design)', 'Associate Director Urban Design',
    'Senior Associate and Partner', 'Associate Director, Smart Places and Sustainability',
    'Director, Cities', 'Senior Policy Manager', 'Strategic Advisor',
    'President EIANZ | Director - Environment and Social (EDF)', 'Director Energy Transition',
    'NSW / ACT State Manager', 'Associate Director - Strategic Planning, Policy and Urban Analytics',
    'NSW Executive Director', 'Chief Operations Officer', 'Technical Lead - Gen AI Program',
    'Practitioner in Residence, Senior Project Officer',
    'Corporate Affairs Director (24 Hour Commissioner Advisor)', 'Policy and Research Officer',
    'Southern Regional & Research Manager', 'Planning, Research and Policy Analyst',
    'Director Strategy and Partnerships',
    'Professor of Planning and Director of Urban Transformations Research Centre',
    'Digital Planning Researcher', 'Transactions Manager', 'Special Projects',
    'Consultant town planner urban design, environmental', 'Acquisitions Manager',
    'Town Planning Consultant', 'Senior Director, Strategic Consulting', 'Software Engineer',
    'Research Scientist', 'General Manager - Strategic Projects and Growth',
    'Senior Infrastructure Planner', 'Acquisitions/Development Manager', 'Graduate Valuer',
    'Student Planner', 'Researcher in Transport Economics', 'Sales Manager',
    'Technology Solutions Lead', 'Executive Manager - Campus Planning and Design',
    'Property Services Officer', 'Director/Planner',
    'National Director, Property Market Economics, Insights & research', 'Freelance',
    'Group Leader - Design ACT', 'Manager, Strategic Planning', 'Property Claims Administrator',
    'Planning Executive', 'NSW Planning Leader', 'Acquisition Manger',
    'Climate Change Specialist', 'Director Property Management - Asia Pacific',
    'Director and Principal Development Engineer', 'Director, Strategic Partnerships and Place',
    'Acquisition Manager', 'Building & Regulatory Services Manager', 'Assistant Planner',
    'Spatial Systems & Survey Manager', 'Manager - Data and Information',
    'Executive Director Water Knowledge', 'Team Leader Infrastructure Planning',
    'Senior Manager, Property & Approvals Strategy', 'Chief Economist', 'Building Designer',
    'Water Resource Officer', 'Director - Urban Planning', 'A/Associate Director',
    'Planning and Compliance Officer', 'Senior Economic Consultant', 'Director / Head Consultant',
    'Senior Planning Officer Assessments', 'Architectural Graduate', 'Urban Planner, Strategic planner',
    'Team Leader Freight Assessment and Management', 'Senior Analyst',
    'Principal Planner, Industry Assessments', 'Freelance Planning Consultant',
    'Senior Property Asset Manager', 'Manager Strategic Land Use Planning',
    'Environmental Consultant', 'Senior Design Advisor', 'Principal Strategy Manager',
    'Sustainability & Research Manager', 'Director Certified Transport Planner',
    'Project Officer - Sustainable Government', 'Manager Development and Environmental Services',
    'Acting Manager Strategic Intelligence', 'Property Specialist', 'Head of Operations',
    'Manager, Water Assessments', 'Senior Advisor Land Use Planning', 'Registered Surveyor',
    'Business Analyst', 'Specialist Property Development Advisor', 'Valuer',
    'Director, Land Use Planning', 'Senior Project Manager Open Spaces', 'Managing Valuer',
    'Head of Financial Modeling and Solutions', 'Head of Spatial Products',
    'Director - National Head of Valuations', 'Student', 'Remediation Construction Manager',
    'Business Leader, Advisory', 'Project Mgr Multi Utilities NS', 'Lead Spatial Analyst',
    'Senior Building Surveyor', 'Senior Policy Officer - Central Coast Strategic Conservation Plan',
    'Manager Customer Care', 'Online Processing', 'Land Development Engineer',
    'Customer Service Specialist', 'Customer Service Support Manager',
    'Team Leader Project Delivery', 'Acquisition analyst',
    'Senior Conservation Planning Officer - Regional Delivery', 'Urban Planner and GIS Analyst',
    'Student Landscape Architect', 'Manager Media and Communications',
    'Senior Land Rights Officer', 'Energy Rater', 'Manager Integrated Planning South',
    'Visual Impact Consultant', 'Asset Management Coordinator',
    'Director - National Precincts and Major Projects Lead',
    'Director and National Service Lead, Design', 'Director, Economics at Ethos Urban',
    'National GIS Manager', 'National Industrial Lead', 'Future Cities Leader',
    'Director Development, Planning and Regulation', 'Founding Director & Hon. Secretary/Treasurer',
    'Director, Regulatory and Advisory Valuations', 'GM - Delivery', 'BD',
    'Manager Property', 'Urban & Regional Planner', 'National Planning Manager',
    'Graduate Strategic Planner', 'Coordinator Data & Information', 'Senior Team Leader',
    'Director - Statewide Strategic Planning & Systems Policy', 'Transaction Manager',
    'General Manager Development', 'Estimating Director', 'Director of Power & Energy',
    'Manager of Environmental Approvals & Biodiversity', 'Director of Transmission & Electrification',
    'Bid Director', 'Assistant Secretary', 'Director, Registered Town Planner',
    'Land use and Transport Economics, GIS and Spatial … GIS and Spatial Modelling, and Strategic Advisor',
    'Economist', 'Lead Organiser', 'Director Customer Strategy & Integration',
    'Executive Manager, Strategy and Development'
  ];

  console.log('🔍 Testing job title categorization coverage...');
  console.log(`Total job titles to test: ${allJobTitles.length}`);

  const results: Record<string, string[]> = {};
  const uncategorized: string[] = [];

  // Initialize results object
  Object.keys(JOB_TITLE_CATEGORIES).forEach(category => {
    results[category] = [];
  });
  results['Other'] = [];

  // Categorize each title
  allJobTitles.forEach(title => {
    const category = categorizeJobTitleEnhanced(title);
    if (category === 'Other') {
      uncategorized.push(title);
    }
    results[category].push(title);
  });

  // Print results
  console.log('\n📊 Categorization Results:');
  Object.entries(results).forEach(([category, titles]) => {
    if (titles.length > 0) {
      console.log(`\n${category}: ${titles.length} titles`);
      if (category === 'Other') {
        console.log('⚠️ Uncategorized titles:');
        titles.forEach(title => console.log(`  - ${title}`));
      }
    }
  });

  console.log(`\n📈 Summary:`);
  console.log(`Total categorized: ${allJobTitles.length - uncategorized.length}`);
  console.log(`Uncategorized: ${uncategorized.length}`);
  console.log(`Coverage: ${((allJobTitles.length - uncategorized.length) / allJobTitles.length * 100).toFixed(1)}%`);

  return;
} 