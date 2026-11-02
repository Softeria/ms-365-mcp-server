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
For app mode use `/users/{user-id}/…`, since `/me` has no signed-in user.

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

## Optional worked example: Docglean 0.1.3

[Docglean](https://github.com/msoukhomlinov/docglean-mcp/tree/v0.1.3) is one possible
processor, not a dependency. Its `probe_document(uri, auth_profile?)` can help choose a
selection; `convert_to_markdown(uri, max_chars, offset=0, pages?, auth_profile?)` converts
directly. Authentication-profile arguments are advertised only when configured. Every
call downloads the source anew; a `pages` selection narrows conversion, not download size.
Supported selection units depend on format, and some formats reject `pages`.

For a PDF selection, call `convert_to_markdown` with a freshly minted URL as `uri`,
`pages: "2"`, and `max_chars: 2000`. Preserve its native `markdown`, `next_offset`,
`returned_chars`, `total_chars`, `content_status`, `format`, `pages_total`,
`pages_returned`, `source_truncated`, and any `ocr` / `pdf_classification` evidence.
If needed, mint a fresh URL and call again with the exact `next_offset` as `offset`,
keeping `pages: "2"` and extraction settings unchanged. `max_chars` is a per-call output
budget and may change without recomputing the returned offset.

`next_offset: null` exhausts only the Markdown produced. `source_truncated` reports
known CSV/workbook row-cap omissions; `false` does not guarantee source coverage.
Inspect `content_status` and OCR evidence such as skipped pages/reasons or unread frames.
Document-level classification is not proof that a selected range was fully read.

## Verification and limits

`test/document-processing.test.ts` uses real M365 URL minting and HTTP ticket redemption,
then two local MCP reference processors with different tool names, arguments, output
fields and continuation formats. It exercises explicit continuation, fresh-ticket retry,
Unicode offset differences and preservation of native coverage evidence. Its source is
synthetic text and its coverage statuses are fixtures: it does not certify any real
converter's PDF, workbook or OCR fidelity. No external processor deployment is exercised.
