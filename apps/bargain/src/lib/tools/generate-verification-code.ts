/* agent-frontmatter:start
AGENT: Generate verification code tool
PURPOSE: Generate verification codes for purchases based on negotiated price
USAGE: Register "generateVerificationCode" tool when composing the agent configuration
EXPORTS: generateVerificationCode
FEATURES:
  - Accepts final price and threadId as input
  - Generates 5-digit verification code
  - Saves code to database with thread association
  - Selects appropriate payment QR code image based on price
  - Validates price input
SEARCHABLE: generate verification code, purchase, tool, bargain, redeem code
agent-frontmatter:end */

import { generateId } from "@agentstart/utils";
import type { RuntimeContext } from "agentstart";
import { baseToolOutputSchema } from "agentstart/agent";
import { tool } from "ai";
import { z } from "zod";
import { db } from "@/db";
import { verificationCode } from "@/db/schema/verification-code";

// Input schema for generateVerificationCode tool
const generateVerificationCodeInputSchema = z.object({
  price: z
    .number()
    .positive()
    .describe(
      "The final determined price (must be a positive number, for example, 29.99)",
    ),
  threadId: z
    .string()
    .describe("The thread ID to associate with the verification code"),
});

// Output schema for generateVerificationCode tool
const generateVerificationCodeOutputSchema = z.object({
  ...baseToolOutputSchema.shape,
  metadata: z
    .object({
      verificationCode: z.string().optional(), // 5-digit code
      paymentImageUrl: z.string().optional(), // Payment QR code image URL
      price: z.number().optional(),
    })
    .optional(),
});

type GenerateVerificationCodeOutput = z.infer<
  typeof generateVerificationCodeOutputSchema
>;

// Function to generate random 5-digit code
function generateRandomCode(): string {
  return Math.floor(10000 + Math.random() * 90000).toString();
}

// Function to select payment image based on price
function selectPaymentImage(price: number): string {
  // Available images: sk999.PNG, sk1199.PNG, sk1499.PNG, sk1699.PNG, sk1899.PNG, sk2099.PNG, sk2299.PNG, sk2599.PNG, sk2999.PNG

  // Map price to nearest available image in fen (分) so ¥25.99 => 2599
  const priceInFen = Math.round(price * 100);
  const availablePrices = [999, 1199, 1499, 1699, 1899, 2099, 2299, 2599, 2999];

  // Find the closest price
  let closestPrice = availablePrices[0];
  let minDiff = Math.abs(priceInFen - closestPrice);

  for (const p of availablePrices) {
    const diff = Math.abs(priceInFen - p);
    if (diff < minDiff) {
      minDiff = diff;
      closestPrice = p;
    }
  }

  return `https://assets.guijia.store/sk${closestPrice}.png`;
}

export const generateVerificationCode = tool({
  description: `生成核销码工具。

当用户表达购买意愿或价格已确定时使用此工具生成5位数字核销码。

输入：
- price: 最终确定的价格（数字，例如 29.99）

输出：
- verificationCode: 5位数字核销码
- paymentImageUrl: 付款二维码图片地址

使用场景：
- 用户说"我要买"、"可以了"、"给我链接"等表达购买意愿
- 砍价完成，需要提供购买方式
- 每次价格变化都应该生成新的核销码

注意事项：
- 必须在价格确定后调用
- 核销码会保存到数据库，后续可用于验证
- 不要自己编造核销码，必须使用此工具生成`,
  inputSchema: generateVerificationCodeInputSchema,
  outputSchema: generateVerificationCodeOutputSchema,
  async *execute({ price }, { experimental_context: context }) {
    const { threadId } = context as RuntimeContext;

    const normalizedPrice = Number(price.toFixed(2));

    // Yield pending status
    yield {
      status: "pending" as const,
      prompt: `正在为价格 ¥${normalizedPrice} 生成核销码...`,
    } satisfies GenerateVerificationCodeOutput;

    try {
      // Validate price range (based on bargain rules)
      if (normalizedPrice < 9.99 || normalizedPrice > 49) {
        yield {
          status: "error" as const,
          prompt: `价格 ¥${normalizedPrice} 超出有效范围（¥9.99 - ¥49）`,
          error: {
            message: `Invalid price range. Price must be between ¥9.99 and ¥49, got ¥${normalizedPrice}`,
          },
        } satisfies GenerateVerificationCodeOutput;
        return;
      }

      // Generate unique 5-digit code
      const code = generateRandomCode();

      // Select appropriate payment image based on price
      const paymentImageUrl = selectPaymentImage(normalizedPrice);

      // Save verification code to database
      const codeId = generateId();
      const now = new Date();
      await db.insert(verificationCode).values({
        id: codeId,
        code,
        threadId,
        price: normalizedPrice.toString(),
        isRedeemed: false,
        createdAt: now,
        updatedAt: now,
      });

      // Yield success with verification code and payment image
      yield {
        status: "done" as const,
        prompt: `核销码生成成功！
        
💳 核销码：${code}
💰 当前价格：¥${normalizedPrice}

使用流程：
1. 在支付页面输入核销码完成付款
2. 带着核销码到归家十二分线下门店，出示给店员领取馄饨
请务必妥善保存此核销码。`,
        metadata: {
          verificationCode: code,
          paymentImageUrl,
          price: normalizedPrice,
        },
      } satisfies GenerateVerificationCodeOutput;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      yield {
        status: "error" as const,
        prompt: `生成核销码失败：${errorMessage}`,
        error: {
          message: errorMessage,
        },
      } satisfies GenerateVerificationCodeOutput;
    }
  },
  toModelOutput: (output) => {
    if (output.error) {
      return {
        type: "error-text" as const,
        value: output.prompt,
      };
    }
    return {
      type: "text" as const,
      value: output.prompt,
    };
  },
});
