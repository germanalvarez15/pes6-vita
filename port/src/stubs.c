/* PES6 Vita — what the shared runtime expects from the platform and the Vita's libc lacks, plus
 * the pieces of upstream left out of the benchmark build (network, window). Filled from the
 * linker's undefined symbols. */
#include <stdint.h>
#include <sys/types.h>
#include <unistd.h>

/* iso_eboot.c reads the ISO with pread; newlib on the Vita may not have it. */
__attribute__((weak)) ssize_t pread(int fd, void *buf, size_t n, off_t off) {
    const off_t was = lseek(fd, 0, SEEK_CUR);
    if (lseek(fd, off, SEEK_SET) < 0) return -1;
    const ssize_t r = read(fd, buf, n);
    lseek(fd, was, SEEK_SET);
    return r;
}

/* net.c (WIRELESS) is not in the benchmark build: no network match has been set up. */
int pes6_net_local_pad(void) { return -1; }
