/*
  # Add storage policies for event images

  Allows authenticated users to upload, read, update, and delete
  event images in the existing public "images" bucket under the
  "events/" folder.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Authenticated users can upload event images'
  ) THEN
    CREATE POLICY "Authenticated users can upload event images"
      ON storage.objects FOR INSERT
      TO authenticated
      WITH CHECK (bucket_id = 'images' AND (storage.foldername(name))[1] = 'events');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Public can read event images'
  ) THEN
    CREATE POLICY "Public can read event images"
      ON storage.objects FOR SELECT
      TO public
      USING (bucket_id = 'images' AND (storage.foldername(name))[1] = 'events');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Authenticated users can delete event images'
  ) THEN
    CREATE POLICY "Authenticated users can delete event images"
      ON storage.objects FOR DELETE
      TO authenticated
      USING (bucket_id = 'images' AND (storage.foldername(name))[1] = 'events');
  END IF;
END $$;
