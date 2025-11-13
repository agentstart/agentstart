/* agent-frontmatter:start
AGENT: Generate purchase link tool
PURPOSE: Generate purchase links based on negotiated price
USAGE: Register "generateLink" tool when composing the agent configuration
EXPORTS: generateLink
FEATURES:
  - Accepts final price as input
  - Generates purchase URL with price parameter
  - Yields structured progress updates
  - Validates price input
SEARCHABLE: generate link, purchase, tool, bargain
agent-frontmatter:end */

import { tool } from "ai";
import { z } from "zod";

// Input schema for generateLink tool
const generateLinkInputSchema = z.object({
  price: z
    .number()
    .positive()
    .describe(
      "The final determined price (must be a positive number, for example, 29.99)",
    ),
});

// Output schema for generateLink tool
const generateLinkOutputSchema = z.object({
  status: z.enum(["pending", "done", "error"]),
  prompt: z.string(),
  url: z.string().optional(),
  price: z.number().optional(),
  error: z
    .object({
      message: z.string(),
    })
    .optional(),
});

type GenerateLinkOutput = z.infer<typeof generateLinkOutputSchema>;

export const generateLink = tool({
  description: `生成购买链接工具。

当用户表达购买意愿或价格已确定时使用此工具。

输入：
- price: 最终确定的价格（数字，例如 29.99）

输出：
- 返回可用于购买的链接 URL

使用场景：
- 用户说"我要买"、"可以了"、"给我链接"等表达购买意愿
- 砍价完成，需要提供购买方式
- 价格发生变化时需要生成新的链接

注意事项：
- 必须在价格确定后调用
- 每次价格变化都应该生成新的链接
- 不要自己编造链接，必须使用此工具生成`,
  inputSchema: generateLinkInputSchema,
  outputSchema: generateLinkOutputSchema,
  async *execute({ price }) {
    // Yield pending status
    yield {
      status: "pending" as const,
      prompt: `正在为价格 ¥${price} 生成购买链接...`,
    } satisfies GenerateLinkOutput;

    try {
      // Validate price range (based on bargain rules)
      if (price < 9.99 || price > 49) {
        yield {
          status: "error" as const,
          prompt: `价格 ¥${price} 超出有效范围（¥9.99 - ¥49）`,
          error: {
            message: `Invalid price range. Price must be between ¥9.99 and ¥49, got ¥${price}`,
          },
        } satisfies GenerateLinkOutput;
        return;
      }

      // Generate purchase URL
      // TODO: Replace with actual payment gateway integration
      // For now, using a placeholder URL with price parameter
      const baseUrl = process.env.PAYMENT_URL || "https://example.com/pay";
      const purchaseUrl = `${baseUrl}?product=guijia-12&price=${price}`;

      // Yield success with URL
      yield {
        status: "done" as const,
        prompt: `已生成购买链接！价格：¥${price}\n\n🔗 购买链接：${purchaseUrl}\n\n点击链接即可完成支付。`,
        url: purchaseUrl,
        price: price,
      } satisfies GenerateLinkOutput;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      yield {
        status: "error" as const,
        prompt: `生成购买链接失败：${errorMessage}`,
        error: {
          message: errorMessage,
        },
      } satisfies GenerateLinkOutput;
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
