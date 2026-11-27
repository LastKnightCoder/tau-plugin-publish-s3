# S3 Static Hosting Publish

Publish selected articles, cards, and project documents from Tau as a website hosted on your own object storage—AWS S3 or S3-compatible services such as Cloudflare R2 or MinIO. When you update content later, click "Publish" again and only changed files are uploaded.

## Get Started in 3 Steps

1. **Install the plugin**: Install "S3 Static Hosting Publish" from the Plugin Center, along with a blog template (such as "Tau Blog") to define how your site looks.
2. **Configure the publish location**: Open "Publish" in the sidebar, open Site Settings, choose "S3 Static Hosting Publish" as the Service, and fill in your account and bucket details.
3. **Select content and publish**: Check the items you want to make public on the left and click "Publish".

## Configuration Fields

- **Access Key and Secret Key**: The access credentials provided by your storage provider.
- **Bucket and Region**: Your bucket name and region, available in your provider's console.
- **Endpoint**: Required for non-AWS services (such as R2 or MinIO); check your provider's documentation for this URL.

Other options can usually be left as default:

- **Access path**: Set this if your site is hosted under a subpath, such as `/blog`;
- **Object prefix**: The folder inside the bucket where site files are written;
- **URL style**: Defaults to "Path style"; switch to "Virtual-hosted style" if your provider requires `bucket.domain` addresses.

## FAQ

**Connection test passed, but some files fail during publishing?** The connection test only verifies that your account can connect. Make sure the account has permissions to upload and delete files, then publish again—files that already succeeded will be skipped.

**How do I make the site accessible?** Configure static website hosting, public access, and custom domains in your storage provider's console, then enter your site address under "Public URL" in Site Settings.

If you only want to export the site to a local folder and deploy it yourself, you do not need this plugin—choose "Local Export" in Site Settings instead. For full details, see [Publish](https://taunote.app/docs/publish/).
