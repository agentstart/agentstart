import { Resend } from "resend";
import { env } from "../env";

const apiKey = env.RESEND_API_KEY;

export const resend = new Resend(apiKey);
