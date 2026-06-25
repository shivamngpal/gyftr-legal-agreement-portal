import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "../config/env";

const s3Client = new S3Client({
  region: env.aws.region,
  credentials: {
    accessKeyId: env.aws.accessKeyId,
    secretAccessKey: env.aws.secretAccessKey,
  },
});

export class S3Service {
  static async uploadPdf(fileBuffer: Buffer, fileName: string, agreementId: string): Promise<string> {
    const key = `agreements/${agreementId}/drafts/${Date.now()}-${fileName}`;
    
    const command = new PutObjectCommand({
      Bucket: env.aws.s3Bucket,
      Key: key,
      Body: fileBuffer,
      ContentType: "application/pdf",
    });

    await s3Client.send(command);

    // Return the URL
    return `https://${env.aws.s3Bucket}.s3.${env.aws.region}.amazonaws.com/${key}`;
  }

  static async getPresignedUrl(fileUrl: string): Promise<string> {
    try {
      // Extract the object key from the full S3 URL
      const urlParts = fileUrl.split(".amazonaws.com/");
      if (urlParts.length !== 2) return fileUrl; // Fallback if not standard S3 URL
      
      const key = urlParts[1];
      
      const command = new GetObjectCommand({
        Bucket: env.aws.s3Bucket,
        Key: key,
      });

      return await getSignedUrl(s3Client, command, { expiresIn: 3600 });
    } catch (error) {
      console.error("Error generating presigned URL:", error);
      return fileUrl;
    }
  }
}
