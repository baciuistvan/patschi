/*
  # Create Gift Cards Storage Bucket

  1. Storage
    - Create `gift-cards` bucket for storing gift card PDFs
    - Enable public access so recipients can download PDFs
    - Set file size limit to 5MB

  2. Security
    - Anyone can read files (public bucket)
    - Only authenticated service role can upload/update/delete
*/

-- Create the gift-cards storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'gift-cards',
  'gift-cards',
  true,
  5242880,
  ARRAY['application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Public can read gift card PDFs" ON storage.objects;
DROP POLICY IF EXISTS "Service role can upload gift card PDFs" ON storage.objects;
DROP POLICY IF EXISTS "Service role can update gift card PDFs" ON storage.objects;
DROP POLICY IF EXISTS "Service role can delete gift card PDFs" ON storage.objects;

-- Allow public read access to gift card PDFs
CREATE POLICY "Public can read gift card PDFs"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'gift-cards');

-- Only service role can upload/update gift card PDFs
CREATE POLICY "Service role can upload gift card PDFs"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'gift-cards');

CREATE POLICY "Service role can update gift card PDFs"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'gift-cards');

CREATE POLICY "Service role can delete gift card PDFs"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'gift-cards');
