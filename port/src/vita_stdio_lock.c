/* PES6 Vita — one lock around fopen and fclose (linked with --wrap, see CMakeLists.txt), as in
 * the NFS Most Wanted Vita port (port/src/platform/vita_stdio_lock.cpp there).
 *
 * The SDK's newlib is built without _RETARGETABLE_LOCKING, so its stdio locks do nothing: fopen
 * takes the first free FILE of a shared pool, two threads opening at the same time can get the
 * same one, and when one closes it the other's descriptor is gone (a crash in lseek). Here the
 * game thread (the ISO, saves, settings), the GE thread (replacement textures) and the runtime's
 * logs all open files. Each FILE is still used by one thread at a time. */
#include <pthread.h>
#include <stdio.h>

static pthread_mutex_t g_stdio_lock = PTHREAD_MUTEX_INITIALIZER;

FILE *__real_fopen(const char *path, const char *mode);
int __real_fclose(FILE *f);

FILE *__wrap_fopen(const char *path, const char *mode) {
    pthread_mutex_lock(&g_stdio_lock);
    FILE *f = __real_fopen(path, mode);
    pthread_mutex_unlock(&g_stdio_lock);
    return f;
}

int __wrap_fclose(FILE *f) {
    pthread_mutex_lock(&g_stdio_lock);
    const int r = __real_fclose(f);
    pthread_mutex_unlock(&g_stdio_lock);
    return r;
}
