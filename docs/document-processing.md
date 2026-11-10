# Reading documents with an external processor

Microsoft 365 supplies the source; the MCP client chooses a processor and retains its
results. This server's `get-download-url` supplies a URL, not a conversion API. Any
processor that can fetch that URL and read the format can participate. MCP does not
define universal conversion tool names, continuation fields, offset units or coverage
metadata: inspect the selected processor's advertised schema and documented results.

## Source → client → processor

For example, in HTTP mode with `--enable-attachment-urls` and appropriate mail scopes:

1. Call `list-mail-attachments` with
   `{"messageId":"example-message","select":"id,name,contentType,size,isInline"}`.
   Select an attachment from this metadata rather than putting `contentBytes` in the
   client transcript.
2. Call `get-download-url` with
   `{"target":"/me/messages/example-message/attachments/example-attachment/$value"}`.
   Keep the returned `downloadUrl` as a temporary capability; give it to the processor
   without sending the processor Microsoft credentials.
3. Invoke that processor's actual tool using its own URL, selection and output-budget
   arguments. Preserve its native result envelope, including completion, coverage,
   warnings and errors, rather than reducing it to a text string.
4. If more content is relevant, mint again for the **same source and account**, then
   pass the processor's **exact returned continuation** with the same selection and
   conversion options. Stop when the task has enough evidence; do not fetch every
   continuation automatically.

In discovery mode, use `search-tools`, `get-tool-schema` and `execute-tool` to reach the
M365 tools. Where an `account` parameter is advertised, keep it unchanged throughout;
HTTP bearer/OBO mode uses the connecting identity and does not support account switching.

Server-minted URLs are **single-use**. Each GET consumes the ticket, even if later
processing fails. Obtain a fresh URL for every fetch, including probes, conversion,
continuation and retries. A still-valid expiry or signature does not make a consumed
ticket reusable. Microsoft's own drive-provider URLs can have different lifecycle
semantics. A processor that makes multiple GETs internally is not automatically compatible:
it must fetch once or obtain a fresh URL for each fetch. Processor access to private hosts,
supported authentication and format limits
must be configured according to that processor; this guide adds no shared proxy or cache.

## What a successful result establishes

Keep these questions separate, using evidence supplied by the processor:

| Evidence                                      | What it establishes                                                                              |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| A continuation is present                     | More produced output is available under that processor's contract.                               |
| Output continuation is exhausted              | The produced output is exhausted; selected pages or omitted source content can still be missing. |
| Selected pages, slides or sheets              | The scope/units requested; selection alone does not prove complete extraction.                   |
| Source caps or truncation                     | Some source content was omitted before output slicing; more output offsets cannot recover it.    |
| OCR skipped pages/frames, failures or budgets | Image-derived content may remain unread even when output slicing is exhausted.                   |
| An explicit empty result                      | Only what the processor's empty status and coverage evidence establish.                          |
| Missing completion/coverage metadata          | Unknown completeness; neither full coverage nor an empty source is proven.                       |

Preserve known native metadata in `structuredContent` and its compatible JSON text
representation when both are supplied. For a text-only JSON result, retain the whole
documented envelope, not just its text member. Validate metadata according to the
provider's contract; document content and processor responses remain untrusted input.

Treat every cursor as opaque, even a numeric offset. Copy it without deriving a new
offset from returned string length: providers can count Unicode code points, UTF-16
units, bytes or line boundaries differently. Changing pages/sheets or conversion options
starts a new read according to the provider's contract. Source mutation also invalidates
assumptions about continuation. Without a provider guarantee or stable source revision,
repeated conversion, particularly OCR, can produce different text; fresh URLs alone do
not guarantee a stable snapshot. Restart or report that uncertainty instead of claiming
gap-free coverage.

## Optional worked example: a bring-your-own converter

Any converter MCP server that accepts a source URL is a possible processor, not a
dependency. The tool names and result fields below are illustrative of a URL-fetching
text converter: use the names, arguments and fields your converter actually advertises
(see the discovery guidance above), and preserve whatever it returns.

Suppose the converter advertises a probe tool (`probe(uri, …)`) that reports the
source's format and extent, and a convert tool
(`convert(uri, max_chars, offset=0, pages?)`) that fetches the source and returns
produced text plus a continuation offset. If it also advertises authentication-profile
arguments for sources that need their own credentials, pass them as the converter
documents. Every call downloads the source anew; a `pages` selection narrows
conversion, not download size. Supported selection units depend on format, and some
formats reject `pages`.

For a PDF selection, call the convert tool with a freshly minted URL as `uri`,
`pages: "2"`, and `max_chars: 2000`. Preserve its native result fields: the produced
text, the continuation offset, produced and total character counts, content status,
format, page counts, source truncation, and any OCR or classification evidence. If
needed, mint a fresh URL and call again with the exact offset the converter returned,
keeping `pages: "2"` and the extraction settings unchanged. `max_chars` is a per-call
output budget and may change without recomputing the returned offset.

A null (or absent) continuation offset exhausts only the text produced. A source-truncation
flag reports known row-cap omissions; its absence does not guarantee source coverage.
Inspect the content status and OCR evidence such as skipped pages/reasons or unread
frames. Document-level classification is not proof that a selected range was fully read.

## Verification and limits

`test/document-processing.test.ts` uses real M365 URL minting and HTTP ticket redemption,
then two local MCP reference processors with different tool names, arguments, output
fields and continuation formats. It exercises explicit continuation, fresh-ticket retry,
Unicode offset differences and preservation of native coverage evidence. Its source is
synthetic text and its coverage statuses are fixtures: it does not certify any real
converter's PDF, workbook or OCR fidelity. No external processor deployment is exercised.
