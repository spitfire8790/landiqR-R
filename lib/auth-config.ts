export const ADMIN_EMAILS: string[] = [
  // Add emails that should automatically receive admin privileges
  'james.strutt@dpie.nsw.gov.au',
  'grace.zhuang@dpie.nsw.gov.au',
  'bernie.no@dpie.nsw.gov.au',
  'sarah.kaehne@wsp.com',
  'mark.elakawi@dpie.nsw.gov.au',
  'jacy.macnee@planning.nsw.gov.au',
  'andrew.bobrige@dpie.nsw.gov.au',
  'christina.sun@dpie.nsw.gov.au',
]

// If not empty, sign-ups are allowed only for users whose email domain matches one of these.
// (e.g. "example.com")
export const ALLOWED_SIGNUP_DOMAINS: string[] = []

// Emails that can register as read-only (if not admin)
export const READONLY_EMAILS: string[] = [
  // e.g. 'viewer@example.com'
  'jonathan.thorpe@dpie.nsw.gov.au',
  'lucy@giraffe.build',
  'adam@giraffe.build', 
] 