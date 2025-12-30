-- Create enum types for status fields
CREATE TYPE public.treatment_status AS ENUM ('novo', 'em_tratamento', 'alta_sucesso', 'abandono', 'aguardando_retorno');
CREATE TYPE public.financial_status AS ENUM ('pago', 'pendente', 'reembolso');

-- Create patients table
CREATE TABLE public.patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  birth_date DATE,
  
  -- Sales Funnel
  lead_source TEXT NOT NULL DEFAULT 'Outros',
  scheduled_appointment BOOLEAN NOT NULL DEFAULT false,
  non_conversion_reason TEXT,
  
  -- Clinical Data
  main_complaint TEXT,
  diagnosis TEXT,
  treatment_objective TEXT,
  suggested_sessions INTEGER,
  completed_sessions INTEGER NOT NULL DEFAULT 0,
  treatment_status treatment_status NOT NULL DEFAULT 'novo',
  
  -- Financial
  payment_modality TEXT NOT NULL DEFAULT 'Particular',
  session_value DECIMAL(10,2),
  financial_status financial_status NOT NULL DEFAULT 'pendente',
  
  -- Documentation
  anamnesis_link TEXT,
  last_evolution_date DATE,
  session_history TEXT[] DEFAULT '{}',
  
  -- Notes
  quick_context TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create sessions table for detailed session history
CREATE TABLE public.sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  notes TEXT,
  evolution TEXT,
  paid BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for patients
CREATE POLICY "Users can view their own patients"
ON public.patients FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own patients"
ON public.patients FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own patients"
ON public.patients FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own patients"
ON public.patients FOR DELETE
USING (auth.uid() = user_id);

-- RLS Policies for sessions (inherit from patient ownership)
CREATE POLICY "Users can view sessions of their patients"
ON public.sessions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.patients
    WHERE patients.id = sessions.patient_id
    AND patients.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create sessions for their patients"
ON public.sessions FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.patients
    WHERE patients.id = sessions.patient_id
    AND patients.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update sessions of their patients"
ON public.sessions FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.patients
    WHERE patients.id = sessions.patient_id
    AND patients.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete sessions of their patients"
ON public.sessions FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.patients
    WHERE patients.id = sessions.patient_id
    AND patients.user_id = auth.uid()
  )
);

-- Create function to update updated_at column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for updated_at
CREATE TRIGGER update_patients_updated_at
BEFORE UPDATE ON public.patients
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_sessions_updated_at
BEFORE UPDATE ON public.sessions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_patients_user_id ON public.patients(user_id);
CREATE INDEX idx_sessions_patient_id ON public.sessions(patient_id);
CREATE INDEX idx_sessions_date ON public.sessions(date);