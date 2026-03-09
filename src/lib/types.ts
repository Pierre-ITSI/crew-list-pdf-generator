export interface Department {
  id: number
  label: string
}

export interface Job {
  id: number
  label: string
  label_female?: string
  professional_category: string
  assedic_category: string
  department: Department
  code_pe?: string
  code_cnc?: string
  code_spaiectacle?: string
}

export interface Intermittent {
  id: number
  firstname: string
  lastname: string
  name: string
  email: string
  mobile_number: string
  gender?: string
  nationality?: string
  address?: string
  address_bis?: string
  city?: string
  zipcode?: string
  birth_date?: string
  birth_city?: string
  puid?: string
  uuid?: string
}

export interface ProjectIntermittent {
  id: number
  name: string
  email: string
  intermittent: Intermittent
  status: string
  status_translated: string
  total_hours: string
  total_days: number
  total_price: number
  project?: Project
}

export interface Project {
  id: number
  name: string
  start_date: string
  end_date: string
  starts_at: string
  ends_at: string
  slug: string
  status: string
  status_translated: string
  payment_period?: string
  social_contributions_rate?: number
  insurance_rate?: number
  pseudo_siret?: string | null
  pole_emploi_object_number?: string | null
}

export interface ExtraSlice {
  quantity: number
  rate: number
}

export interface Contract {
  id: number
  puid: string
  project: Project
  production_id: number
  production_name: string
  job_id: number
  job_professional_category: string
  job_professional_category_translated: string
  starts_at: string
  ends_at: string
  status: string
  status_translated: string
  remuneration_type: string
  remuneration_type_translated: string
  remuneration_quantity: string
  remuneration_quantity_raw: number
  remuneration_rate: number
  remuneration_price: string
  remuneration_total: string
  remuneration_total_raw: number
  remuneration_extra_slices: Record<string, ExtraSlice>
  specificity: string
  created_at: string
  updated_at: string
}

export interface ProjectJob {
  id: number
  project_id: number
  label: string
  reference: string
  job_id: number
  job: Job
  project_intermittent_id: number
  project_intermittent: ProjectIntermittent
  contract: Contract
}

export type CrewData = Record<string, ProjectJob[]>

export interface InfoRowOverride {
  col0?: string   // Fonction
  col1?: string   // Nom
  col2?: string   // Mobile
  col3?: string   // Email
}

export interface ListeOverrides {
  productionName?: string      // overrides JSON value in header + info block
  filmName?: string            // overrides JSON value in header
  studioDecor?: string         // extra meta row (empty by default)
  clientRow?: InfoRowOverride
  agenceRow?: InfoRowOverride
  producteurRow?: InfoRowOverride  // col0 = "Producteur" is fixed
}
