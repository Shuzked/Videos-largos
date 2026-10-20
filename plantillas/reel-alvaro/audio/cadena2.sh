set -e
cd /home/user/videos-largos/trabajo/a1-evergreen
cd ../intro/remotion-intro
npx remotion render ReelA1 out/a1-review-sfx.mp4 --props='{"stem":"sfx"}' --scale=0.5 --crf=24 --concurrency=3 --timeout=120000 --log=error
rm -rf /tmp/remotion-v4.0.536-assets*
cd ../../a1-evergreen && chmod +x master.sh && ./master.sh ../intro/remotion-intro/out/a1-review-sfx.mp4 preview/a1-review-v5.mp4 copy
echo CADENA_OK
