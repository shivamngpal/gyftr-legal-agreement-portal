import dotenv from "dotenv";

dotenv.config();

export const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: parseInt(process.env.PORT || "5000", 10),
  databaseUrl: process.env.DATABASE_URL || "",
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:3000",
  aws: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
    region: process.env.AWS_REGION || "",
    s3Bucket: process.env.AWS_S3_BUCKET || "",
  },
  openai: {
    apiKey: process.env.OPENAI_API_KEY || "",
  },
  jwt: {
    secret: process.env.JWT_SECRET || "default_development_secret",
    expiresIn: process.env.JWT_EXPIRES_IN || "1d",
  },
};

