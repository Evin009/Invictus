export const STATE_ABBREV: Record<string, string> = {
  "Alabama":"AL","Alaska":"AK","Arizona":"AZ","Arkansas":"AR","California":"CA",
  "Colorado":"CO","Connecticut":"CT","Delaware":"DE","Florida":"FL","Georgia":"GA",
  "Hawaii":"HI","Idaho":"ID","Illinois":"IL","Indiana":"IN","Iowa":"IA",
  "Kansas":"KS","Kentucky":"KY","Louisiana":"LA","Maine":"ME","Maryland":"MD",
  "Massachusetts":"MA","Michigan":"MI","Minnesota":"MN","Mississippi":"MS","Missouri":"MO",
  "Montana":"MT","Nebraska":"NE","Nevada":"NV","New Hampshire":"NH","New Jersey":"NJ",
  "New Mexico":"NM","New York":"NY","North Carolina":"NC","North Dakota":"ND","Ohio":"OH",
  "Oklahoma":"OK","Oregon":"OR","Pennsylvania":"PA","Rhode Island":"RI","South Carolina":"SC",
  "South Dakota":"SD","Tennessee":"TN","Texas":"TX","Utah":"UT","Vermont":"VT",
  "Virginia":"VA","Washington":"WA","West Virginia":"WV","Wisconsin":"WI","Wyoming":"WY",
}

export const STATE_CITIES: Record<string, string[]> = {
  "Alabama":       ["Birmingham","Huntsville","Mobile","Montgomery"],
  "Alaska":        ["Anchorage","Fairbanks","Juneau"],
  "Arizona":       ["Chandler","Mesa","Phoenix","Scottsdale","Tempe","Tucson"],
  "Arkansas":      ["Fayetteville","Fort Smith","Little Rock"],
  "California":    ["Irvine","Los Angeles","Oakland","Sacramento","San Diego","San Francisco","San Jose","Santa Clara"],
  "Colorado":      ["Aurora","Boulder","Colorado Springs","Denver","Fort Collins"],
  "Connecticut":   ["Bridgeport","Hartford","New Haven","Stamford"],
  "Delaware":      ["Dover","Newark","Wilmington"],
  "Florida":       ["Fort Lauderdale","Jacksonville","Miami","Orlando","St. Petersburg","Tallahassee","Tampa"],
  "Georgia":       ["Atlanta","Augusta","Columbus","Savannah"],
  "Hawaii":        ["Hilo","Honolulu","Kailua"],
  "Idaho":         ["Boise","Idaho Falls","Nampa"],
  "Illinois":      ["Aurora","Chicago","Naperville","Rockford"],
  "Indiana":       ["Fort Wayne","Indianapolis","South Bend"],
  "Iowa":          ["Cedar Rapids","Des Moines","Sioux City"],
  "Kansas":        ["Kansas City","Olathe","Overland Park","Wichita"],
  "Kentucky":      ["Bowling Green","Lexington","Louisville"],
  "Louisiana":     ["Baton Rouge","New Orleans","Shreveport"],
  "Maine":         ["Bangor","Portland"],
  "Maryland":      ["Annapolis","Baltimore","Frederick","Rockville"],
  "Massachusetts": ["Boston","Cambridge","Lowell","Springfield","Worcester"],
  "Michigan":      ["Ann Arbor","Detroit","Grand Rapids","Lansing"],
  "Minnesota":     ["Minneapolis","Rochester","St. Paul"],
  "Mississippi":   ["Gulfport","Jackson","Southaven"],
  "Missouri":      ["Columbia","Kansas City","Springfield","St. Louis"],
  "Montana":       ["Billings","Bozeman","Great Falls","Missoula"],
  "Nebraska":      ["Lincoln","Omaha"],
  "Nevada":        ["Henderson","Las Vegas","Reno"],
  "New Hampshire": ["Concord","Manchester","Nashua"],
  "New Jersey":    ["Edison","Jersey City","Newark","Trenton"],
  "New Mexico":    ["Albuquerque","Rio Rancho","Santa Fe"],
  "New York":      ["Albany","Buffalo","New York City","Rochester","Syracuse","Yonkers"],
  "North Carolina":["Charlotte","Durham","Greensboro","Raleigh","Winston-Salem"],
  "North Dakota":  ["Bismarck","Fargo","Grand Forks"],
  "Ohio":          ["Cincinnati","Cleveland","Columbus","Dayton","Toledo"],
  "Oklahoma":      ["Norman","Oklahoma City","Tulsa"],
  "Oregon":        ["Eugene","Portland","Salem"],
  "Pennsylvania":  ["Allentown","Philadelphia","Pittsburgh","Reading"],
  "Rhode Island":  ["Cranston","Providence","Warwick"],
  "South Carolina":["Charleston","Columbia","Greenville"],
  "South Dakota":  ["Rapid City","Sioux Falls"],
  "Tennessee":     ["Chattanooga","Knoxville","Memphis","Nashville"],
  "Texas":         ["Austin","Dallas","El Paso","Fort Worth","Houston","San Antonio"],
  "Utah":          ["Ogden","Provo","Salt Lake City","West Valley City"],
  "Vermont":       ["Burlington","Essex","Montpelier"],
  "Virginia":      ["Arlington","Chesapeake","Norfolk","Richmond","Virginia Beach"],
  "Washington":    ["Bellevue","Seattle","Spokane","Tacoma"],
  "West Virginia": ["Charleston","Huntington","Morgantown"],
  "Wisconsin":     ["Green Bay","Madison","Milwaukee"],
  "Wyoming":       ["Casper","Cheyenne","Laramie"],
}

// Flattened "City, ST" list for datalist-style free-text-with-suggestions fields.
export const CITY_STATE_OPTIONS: string[] = Object.entries(STATE_CITIES).flatMap(
  ([state, cities]) => cities.map(city => `${city}, ${STATE_ABBREV[state]}`)
)

export const DEGREE_OPTIONS = [
  "High School Diploma", "Associate's (A.A.)", "Associate's (A.S.)",
  "Bachelor's (B.A.)", "Bachelor's (B.S.)", "Bachelor's (B.B.A.)", "Bachelor's (B.Eng.)", "Bachelor's (B.F.A.)",
  "Master's (M.A.)", "Master's (M.S.)", "Master's (M.B.A.)", "Master's (M.Eng.)", "Master's (M.F.A.)", "Master's (M.Ed.)",
  "Juris Doctor (J.D.)", "Doctor of Medicine (M.D.)", "Ph.D.", "Ed.D.", "Other",
]

export const MAJOR_OPTIONS = [
  "Computer Science", "Computer Engineering", "Electrical Engineering", "Mechanical Engineering",
  "Civil Engineering", "Chemical Engineering", "Industrial Engineering", "Aerospace Engineering",
  "Biomedical Engineering", "Software Engineering", "Data Science", "Information Systems",
  "Information Technology", "Cybersecurity", "Mathematics", "Statistics", "Physics", "Chemistry",
  "Biology", "Biochemistry", "Environmental Science", "Economics", "Finance", "Accounting",
  "Business Administration", "Marketing", "Management", "Supply Chain Management",
  "International Business", "Political Science", "Psychology", "Sociology", "Anthropology",
  "Communications", "Journalism", "English", "History", "Philosophy", "Linguistics",
  "Graphic Design", "Architecture", "Nursing", "Public Health", "Kinesiology", "Education",
  "Criminal Justice", "Law", "Music", "Art", "Film Studies", "Theatre", "Other",
]

export const SCHOOL_OPTIONS = [
  "Arizona State University", "Auburn University", "Boston University", "Brown University",
  "California Institute of Technology", "Carnegie Mellon University", "Columbia University",
  "Cornell University", "Duke University", "Emory University", "Florida State University",
  "George Washington University", "Georgia Institute of Technology", "Harvard University",
  "Indiana University Bloomington", "Iowa State University", "Johns Hopkins University",
  "Massachusetts Institute of Technology", "Michigan State University", "New York University",
  "North Carolina State University", "Northeastern University", "Northwestern University",
  "Ohio State University", "Pennsylvania State University", "Princeton University",
  "Purdue University", "Rice University", "Rutgers University", "Stanford University",
  "Texas A&M University", "The University of Texas at Austin", "Tufts University",
  "University at Buffalo", "University of Arizona", "University of California, Berkeley",
  "University of California, Davis", "University of California, Irvine",
  "University of California, Los Angeles", "University of California, San Diego",
  "University of California, Santa Barbara", "University of Central Florida",
  "University of Chicago", "University of Colorado Boulder", "University of Connecticut",
  "University of Florida", "University of Georgia", "University of Illinois Urbana-Champaign",
  "University of Maryland, College Park", "University of Massachusetts Amherst",
  "University of Miami", "University of Michigan", "University of Minnesota",
  "University of North Carolina at Chapel Hill", "University of Notre Dame",
  "University of Pennsylvania", "University of Pittsburgh", "University of South Florida",
  "University of Southern California", "University of Virginia", "University of Washington",
  "University of Wisconsin–Madison", "Vanderbilt University", "Virginia Tech",
  "Wake Forest University", "Washington University in St. Louis", "Yale University", "Other",
]

// Abbreviated to match the format already stored by the resume parser (e.g. "May", "Aug").
export const MONTH_OPTIONS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
]

export function gradYearOptions(span = 6): string[] {
  const current = new Date().getFullYear()
  const years: string[] = []
  for (let y = current - span; y <= current + span; y++) years.push(String(y))
  return years
}
