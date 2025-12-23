import type { NextPage } from 'next';
import Head from 'next/head';
import { useState, FormEvent } from 'react';

import styles from '../styles/Home.module.css';
import { useUploadImage } from '../lib/queries';
import { AppHeader } from '../components/AppHeader';

const CreateNftPage: NextPage = () => {
  const uploadMutation = useUploadImage();

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const handleImageChange = (file: File | null) => {
    setImageFile(file);
    setUploadedUrl(null);
    if (file) {
      const url = URL.createObjectURL(file);
      setImagePreview(url);
    } else {
      setImagePreview(null);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!imageFile) {
      setFormError('请先选择一张图片。');
      return;
    }

    try {
      const res = await uploadMutation.mutateAsync(imageFile);
      setUploadedUrl(res.url);
    } catch (err: any) {
      setFormError(err?.message || '上传失败，请稍后重试。');
    }
  };

  return (
    <div className={styles.page}>
      <Head>
        <title>Create NFT · Charity NFT</title>
      </Head>

      <AppHeader active="create" />

      <main className={styles.main}>
        <section className={styles.leftColumn}>
          <div className={styles.sectionCard}>
            <div className={styles.sectionHeader}>
              <div>
                <h2 className={styles.sectionTitle}>Create NFT asset</h2>
                <p className={styles.sectionSubtitle}>
                  上传图片到 IPFS，拿到 URL / CID 之后，你可以在任意 BSC
                  合约中完成真正的 NFT mint。
                </p>
              </div>
            </div>

            <form className={styles.form} onSubmit={handleSubmit}>
              <div className={styles.formGroup}>
                <label className={styles.label}>
                  NFT 图片
                  <div className={styles.fileInputWrapper}>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) =>
                        handleImageChange(
                          e.target.files?.[0] ? e.target.files[0] : null,
                        )
                      }
                    />
                  </div>
                </label>
                {imagePreview && (
                  <div className={styles.imagePreview}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={imagePreview} alt="预览" />
                  </div>
                )}
              </div>

              {formError && (
                <div className={styles.errorBox}>{formError}</div>
              )}

              <button
                type="submit"
                className={styles.primaryButton}
                disabled={uploadMutation.isPending}
              >
                {uploadMutation.isPending ? '上传中…' : '上传到 IPFS'}
              </button>

              {uploadedUrl && (
                <p className={styles.helperText}>
                  已上传成功，你可以将此 URL 写入 NFT 元数据：{' '}
                  <a href={uploadedUrl} target="_blank" rel="noreferrer">
                    {uploadedUrl}
                  </a>
                </p>
              )}
            </form>
          </div>
        </section>
      </main>
    </div>
  );
};

export default CreateNftPage;

