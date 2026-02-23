import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

const s3 = new S3Client({
  requestHandler: { connectionTimeout: 3000 },
})

export async function storeTemplate(bucket: string, filename: string, body: string): Promise<void> {
  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: filename,
      Body: body,
      ContentType: 'text/html',
      ContentDisposition: 'inline',
    }),
  )
}

export async function storeDocument(bucket: string, filename: string, body: Buffer): Promise<void> {
  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: filename,
      Body: body,
      ContentType: 'application/pdf',
      ContentDisposition: 'inline',
    }),
  )
}

export async function getDocumentUrl(bucket: string, filename: string): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: filename,
  })
  return getSignedUrl(s3, command, { expiresIn: 120 })
}
